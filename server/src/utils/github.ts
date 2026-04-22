import { CommitEntry, DateWindow, RepoActivity } from '../types.js';

interface GithubCommitItem {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
  };
  author: {
    login: string;
  } | null;
}

interface GithubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
}

function hasMorePage<T>(items: T[]): boolean {
  return items.length === 100;
}

function normalizeGithubRepo(input: string): string | undefined {
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

function matchAuthor(authorQuery: string, commit: CommitEntry): boolean {
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

function buildGithubHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'devtrace',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function githubFetch<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: buildGithubHeaders(token),
  });

  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetAt = response.headers.get('x-ratelimit-reset');
    const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;
    const apiMessage = responseBody?.message?.toLowerCase() ?? '';

    if (response.status === 401) {
      throw new Error('GitHub authentication failed (401). Check your token value or token format.');
    }
    if (response.status === 403) {
      const rateLimited =
        remaining === '0' ||
        apiMessage.includes('rate limit') ||
        apiMessage.includes('abuse detection');
      if (rateLimited) {
        const resetHint = resetAt
          ? ` Rate limit resets at ${new Date(Number(resetAt) * 1000).toLocaleString()}.`
          : '';
        throw new Error(`GitHub API rate limit exceeded.${resetHint}`);
      }
      throw new Error(token
        ? 'GitHub access forbidden (403). Token lacks required repository permissions.'
        : 'GitHub public access forbidden (403). This can happen due to rate limits or temporary throttling.');
    }
    if (response.status === 404) {
      throw new Error('GitHub repository or user not found, or it is private and inaccessible with current credentials.');
    }
    throw new Error(`GitHub request failed with status ${response.status}${responseBody?.message ? `: ${responseBody.message}` : ''}.`);
  }

  return (await response.json()) as T;
}

async function fetchGithubRepoInfo(repoFullName: string, token?: string): Promise<GithubRepoInfo> {
  return githubFetch<GithubRepoInfo>(`https://api.github.com/repos/${repoFullName}`, token);
}

async function fetchGithubRepoCommits(repoFullName: string, token: string | undefined, dateWindow: DateWindow): Promise<CommitEntry[]> {
  const commits: CommitEntry[] = [];
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
    const pageCommits = await githubFetch<GithubCommitItem[]>(url, token);

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

async function fetchGithubAccessibleRepos(token: string): Promise<GithubRepoInfo[]> {
  const repos: GithubRepoInfo[] = [];
  let page = 1;

  while (true) {
    const pageRepos = await githubFetch<GithubRepoInfo[]>(`https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated`, token);
    repos.push(...pageRepos);
    if (!hasMorePage(pageRepos)) {
      break;
    }
    page += 1;
  }

  return repos;
}

async function fetchGithubPublicUserRepos(username: string): Promise<GithubRepoInfo[]> {
  const repos: GithubRepoInfo[] = [];
  let page = 1;

  while (true) {
    const pageRepos = await githubFetch<GithubRepoInfo[]>(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=public&sort=updated`, undefined);
    repos.push(...pageRepos);
    if (!hasMorePage(pageRepos)) {
      break;
    }
    page += 1;
  }

  return repos;
}

export async function fetchGithubRepositoryActivity(
  repository: string,
  authorQuery: string,
  token: string | undefined,
  dateWindow: DateWindow,
): Promise<RepoActivity> {
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

export async function fetchGithubAllActivity(
  targetUser: string,
  authorQuery: string,
  token: string | undefined,
  dateWindow: DateWindow,
  warnings: string[],
): Promise<RepoActivity[]> {
  const repos = token
    ? await fetchGithubAccessibleRepos(token)
    : await fetchGithubPublicUserRepos(targetUser);

  const activities: RepoActivity[] = [];

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
    } catch {
      warnings.push(`GitHub: Failed to process ${repo.full_name}.`);
    }
  }

  return activities;
}
