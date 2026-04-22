function hasMorePage(items) {
    return items.length === 100;
}
function normalizeGitlabRepo(input) {
    const trimmed = input.trim().replace(/\.git$/i, '');
    const urlMatch = trimmed.match(/^https?:\/\/gitlab\.com\/(.+)$/i);
    if (urlMatch) {
        return urlMatch[1].replace(/^\/+|\/+$/g, '');
    }
    const slugMatch = trimmed.match(/^([^\s]+\/[^\s]+(?:\/[^\s]+)*)$/);
    if (slugMatch) {
        return slugMatch[1];
    }
    return undefined;
}
function matchAuthor(authorQuery, commit) {
    const query = authorQuery.trim().toLowerCase();
    if (!query) {
        return true;
    }
    const text = `${commit.author} ${commit.authorEmail ?? ''}`.toLowerCase();
    return text.includes(query);
}
function buildGitlabHeaders(token) {
    const headers = {};
    if (token) {
        headers['PRIVATE-TOKEN'] = token;
    }
    return headers;
}
async function gitlabFetch(url, token) {
    const response = await fetch(url, {
        headers: buildGitlabHeaders(token),
    });
    if (!response.ok) {
        const responseBody = (await response.json().catch(() => null));
        const message = typeof responseBody?.message === 'string'
            ? responseBody.message
            : responseBody?.message
                ? JSON.stringify(responseBody.message)
                : '';
        if (response.status === 401) {
            throw new Error('GitLab authentication failed (401). Check your token value.');
        }
        if (response.status === 403) {
            throw new Error(token
                ? 'GitLab access forbidden (403). Token may be missing required scopes.'
                : 'GitLab public access forbidden (403).');
        }
        if (response.status === 404) {
            throw new Error('GitLab repository or user not found, or it is private and inaccessible with current credentials.');
        }
        throw new Error(`GitLab request failed with status ${response.status}${message ? `: ${message}` : ''}.`);
    }
    return (await response.json());
}
async function fetchGitlabProject(pathWithNamespace, token) {
    const encoded = encodeURIComponent(pathWithNamespace);
    return gitlabFetch(`https://gitlab.com/api/v4/projects/${encoded}`, token);
}
async function fetchGitlabProjectCommits(projectId, token, dateWindow) {
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
        const pageCommits = await gitlabFetch(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits?${params.toString()}`, token);
        for (const commit of pageCommits) {
            commits.push({
                hash: commit.id,
                message: commit.message || commit.title,
                author: commit.author_name,
                authorEmail: commit.author_email,
                date: commit.authored_date || commit.committed_date,
            });
        }
        if (!hasMorePage(pageCommits)) {
            break;
        }
        page += 1;
    }
    return commits;
}
async function fetchGitlabPublicUserProjects(username) {
    const users = await gitlabFetch(`https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`, undefined);
    const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
        return [];
    }
    const projects = [];
    let page = 1;
    while (true) {
        const pageProjects = await gitlabFetch(`https://gitlab.com/api/v4/users/${user.id}/projects?per_page=100&page=${page}&visibility=public&order_by=last_activity_at&sort=desc`, undefined);
        projects.push(...pageProjects);
        if (!hasMorePage(pageProjects)) {
            break;
        }
        page += 1;
    }
    return projects;
}
async function fetchGitlabAccessibleProjects(token) {
    const projects = [];
    let page = 1;
    while (true) {
        const pageProjects = await gitlabFetch(`https://gitlab.com/api/v4/projects?membership=true&per_page=100&page=${page}&order_by=last_activity_at&sort=desc`, token);
        projects.push(...pageProjects);
        if (!hasMorePage(pageProjects)) {
            break;
        }
        page += 1;
    }
    return projects;
}
export async function fetchGitlabRepositoryActivity(repository, authorQuery, token, dateWindow) {
    const pathWithNamespace = normalizeGitlabRepo(repository);
    if (!pathWithNamespace) {
        throw new Error('For GitLab, repository must be in group/project or https://gitlab.com/group/project format.');
    }
    const project = await fetchGitlabProject(pathWithNamespace, token);
    const commits = await fetchGitlabProjectCommits(project.id, token, dateWindow);
    const filtered = commits.filter((commit) => matchAuthor(authorQuery, commit));
    return {
        repoName: project.name,
        repoPathOrUrl: project.web_url,
        source: 'remote',
        provider: 'gitlab',
        commitCount: filtered.length,
        commits: filtered,
        summary: '',
    };
}
export async function fetchGitlabAllActivity(targetUser, authorQuery, token, dateWindow, warnings) {
    const projects = token
        ? await fetchGitlabAccessibleProjects(token)
        : await fetchGitlabPublicUserProjects(targetUser);
    const activities = [];
    for (const project of projects) {
        try {
            const commits = await fetchGitlabProjectCommits(project.id, token, dateWindow);
            const filtered = commits.filter((commit) => matchAuthor(authorQuery, commit));
            if (filtered.length === 0) {
                continue;
            }
            activities.push({
                repoName: project.name,
                repoPathOrUrl: project.web_url,
                source: 'remote',
                provider: 'gitlab',
                commitCount: filtered.length,
                commits: filtered,
                summary: '',
            });
        }
        catch {
            warnings.push(`GitLab: Failed to process ${project.path_with_namespace}.`);
        }
    }
    return activities;
}
