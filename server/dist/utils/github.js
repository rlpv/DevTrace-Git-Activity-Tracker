export class GitHubApiError extends Error {
    constructor(code, message, status, resetAt) {
        super(message);
        this.code = code;
        this.status = status;
        this.resetAt = resetAt;
    }
}
function hasMorePage(items) {
    return items.length === 100;
}
function normalizeGithubRepo(input) {
    const trimmed = input.trim().replace(/\.git$/i, '');
    const urlMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
    if (urlMatch) {
        return `${urlMatch[1]}/${urlMatch[2]}`;
    }
    const slugMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (slugMatch) {
        return `${slugMatch[1]}/${slugMatch[2]}`;
    }
    return undefined;
}
function matchAuthor(authorQuery, commit) {
    const query = authorQuery.trim().toLowerCase();
    if (!query) {
        return true;
    }
    const text = [
        commit.author,
        commit.authorEmail ?? '',
        commit.sourceMeta?.username ?? '',
    ]
        .join(' ')
        .toLowerCase();
    return text.includes(query);
}
function buildGithubHeaders(token) {
    const headers = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'devtrace',
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}
function parseResetAt(resetHeaderValue) {
    if (!resetHeaderValue) {
        return undefined;
    }
    const epoch = Number(resetHeaderValue);
    if (Number.isNaN(epoch)) {
        return undefined;
    }
    return new Date(epoch * 1000).toISOString();
}
function buildGithubError(status, tokenProvided, remaining, resetAt, apiMessage, repoInfoWithoutToken) {
    if (status === 401) {
        return new GitHubApiError('GITHUB_INVALID_TOKEN', 'GitHub token is invalid or expired.', 401, resetAt);
    }
    if (status === 403) {
        const rateLimited = remaining === '0' ||
            apiMessage.includes('rate limit') ||
            apiMessage.includes('abuse detection');
        if (rateLimited) {
            return new GitHubApiError(tokenProvided ? 'GITHUB_AUTH_RATE_LIMIT' : 'GITHUB_PUBLIC_RATE_LIMIT', tokenProvided
                ? 'GitHub authenticated rate limit exceeded.'
                : 'GitHub public rate limit exceeded.', 403, resetAt);
        }
        return new GitHubApiError('GITHUB_FORBIDDEN', 'GitHub request is forbidden for the current access scope.', 403, resetAt);
    }
    if (status === 404) {
        if (repoInfoWithoutToken) {
            return new GitHubApiError('GITHUB_PRIVATE_REPO_REQUIRES_TOKEN', 'Private repository access requires a GitHub token.', 404, resetAt);
        }
        return new GitHubApiError('GITHUB_NOT_FOUND', 'GitHub resource was not found.', 404, resetAt);
    }
    return new GitHubApiError('GITHUB_FORBIDDEN', 'GitHub request failed.', status, resetAt);
}
async function githubFetch(url, token, context) {
    const response = await fetch(url, {
        headers: buildGithubHeaders(token),
    });
    if (!response.ok) {
        const remaining = response.headers.get('x-ratelimit-remaining');
        const resetAt = parseResetAt(response.headers.get('x-ratelimit-reset'));
        const responseBody = (await response.json().catch(() => null));
        const apiMessage = responseBody?.message?.toLowerCase() ?? '';
        throw buildGithubError(response.status, Boolean(token), remaining, resetAt, apiMessage, Boolean(context?.repoInfoWithoutToken));
    }
    return (await response.json());
}
async function fetchGithubRepoInfo(repoFullName, token) {
    return githubFetch(`https://api.github.com/repos/${repoFullName}`, token, { repoInfoWithoutToken: !token });
}
async function fetchGithubRepoCommits(repoFullName, token, dateWindow) {
    const commits = [];
    let page = 1;
    while (true) {
        const params = new URLSearchParams({
            per_page: '100',
            page: String(page),
        });
        if (dateWindow.since) {
            params.set('since', dateWindow.since);
        }
        if (dateWindow.until) {
            params.set('until', dateWindow.until);
        }
        const url = `https://api.github.com/repos/${repoFullName}/commits?${params.toString()}`;
        const pageCommits = await githubFetch(url, token);
        for (const commit of pageCommits) {
            commits.push({
                hash: commit.sha,
                message: commit.commit.message,
                author: commit.commit.author?.name ?? 'Unknown',
                authorEmail: commit.commit.author?.email,
                date: commit.commit.author?.date ?? '',
                sourceMeta: {
                    username: commit.author?.login,
                },
            });
        }
        if (!hasMorePage(pageCommits)) {
            break;
        }
        page += 1;
    }
    return commits;
}
async function fetchGithubAccessibleRepos(token) {
    const repos = [];
    let page = 1;
    while (true) {
        const pageRepos = await githubFetch(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, token);
        repos.push(...pageRepos);
        if (!hasMorePage(pageRepos)) {
            break;
        }
        page += 1;
    }
    return repos;
}
async function fetchGithubPublicUserRepos(username) {
    const repos = [];
    let page = 1;
    while (true) {
        const pageRepos = await githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=public&sort=updated`, undefined);
        repos.push(...pageRepos);
        if (!hasMorePage(pageRepos)) {
            break;
        }
        page += 1;
    }
    return repos;
}
export async function fetchGithubRepositoryActivity(repository, authorQuery, token, dateWindow) {
    const repoFullName = normalizeGithubRepo(repository);
    if (!repoFullName) {
        throw new Error('For GitHub, repository must be in owner/repo or https://github.com/owner/repo format.');
    }
    const repoInfo = await fetchGithubRepoInfo(repoFullName, token);
    const commits = await fetchGithubRepoCommits(repoInfo.full_name, token, dateWindow);
    const filtered = commits.filter((commit) => matchAuthor(authorQuery, commit));
    return {
        repoName: repoInfo.name,
        repoPathOrUrl: repoInfo.html_url,
        source: 'remote',
        provider: 'github',
        commitCount: filtered.length,
        commits: filtered,
        summary: '',
    };
}
export async function fetchGithubAllActivity(targetUser, authorQuery, token, dateWindow, warnings) {
    const repos = token
        ? await fetchGithubAccessibleRepos(token)
        : await fetchGithubPublicUserRepos(targetUser);
    const activities = [];
    for (const repo of repos) {
        try {
            const commits = await fetchGithubRepoCommits(repo.full_name, token, dateWindow);
            const filtered = commits.filter((commit) => matchAuthor(authorQuery, commit));
            if (filtered.length === 0) {
                continue;
            }
            activities.push({
                repoName: repo.name,
                repoPathOrUrl: repo.html_url,
                source: 'remote',
                provider: 'github',
                commitCount: filtered.length,
                commits: filtered,
                summary: '',
            });
        }
        catch {
            warnings.push(`GitHub: Failed to process ${repo.full_name}.`);
        }
    }
    return activities;
}
