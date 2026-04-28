import { CommitEntry, DateWindow, RepoActivity } from '../types.js';

interface GitlabProject {
  id: number;
  name: string;
  web_url: string;
  path_with_namespace: string;
}

interface GitlabCommit {
  id: string;
  authored_date: string;
  committed_date: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
}

function hasMorePage<T>(items: T[]): boolean {
  return items.length === 100;
}

const DEFAULT_PUBLIC_PROJECT_SCAN_LIMIT = 8;
const DEFAULT_AUTH_PROJECT_SCAN_LIMIT = 30;
const DEFAULT_PUBLIC_COMMIT_PAGE_LIMIT = 2;
const DEFAULT_AUTH_COMMIT_PAGE_LIMIT = 3;

function readPositiveIntEnv(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function normalizeGitlabRepo(input: string): string | undefined {
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

function matchAuthor(authorQuery: string, commit: CommitEntry): boolean {
  const query = authorQuery.trim().toLowerCase().replace(/^@/, '');
  if (!query) {
    return true;
  }

  const identities = [commit.author, commit.authorEmail ?? '']
    .map((value) => value.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);

  for (const identity of identities) {
    if (identity === query) {
      return true;
    }

    const atIndex = identity.indexOf('@');
    if (atIndex > 0 && identity.slice(0, atIndex) === query) {
      return true;
    }
  }

  return false;
}

function buildGitlabHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['PRIVATE-TOKEN'] = token;
  }
  return headers;
}

async function gitlabFetch<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: buildGitlabHeaders(token),
  });

  if (!response.ok) {
    const responseBody = (await response.json().catch(() => null)) as { message?: string | Record<string, string[]> } | null;
    const message =
      typeof responseBody?.message === 'string'
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

  return (await response.json()) as T;
}

async function fetchGitlabProject(pathWithNamespace: string, token?: string): Promise<GitlabProject> {
  const encoded = encodeURIComponent(pathWithNamespace);
  return gitlabFetch<GitlabProject>(`https://gitlab.com/api/v4/projects/${encoded}`, token);
}

async function fetchGitlabProjectCommits(
  projectId: number,
  token: string | undefined,
  dateWindow: DateWindow,
  options?: { maxPages?: number },
): Promise<CommitEntry[]> {
  const commits: CommitEntry[] = [];
  let page = 1;
  const maxPages = options?.maxPages;

  while (true) {
    if (maxPages && page > maxPages) {
      break;
    }

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

    const pageCommits = await gitlabFetch<GitlabCommit[]>(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits?${params.toString()}`, token);

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

async function fetchGitlabPublicUserProjects(username: string): Promise<GitlabProject[]> {
  const users = await gitlabFetch<Array<{ id: number; username: string }>>(
    `https://gitlab.com/api/v4/users?username=${encodeURIComponent(username)}`,
    undefined,
  );

  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) {
    return [];
  }

  const projects: GitlabProject[] = [];
  let page = 1;

  while (true) {
    const pageProjects = await gitlabFetch<GitlabProject[]>(
      `https://gitlab.com/api/v4/users/${user.id}/projects?per_page=100&page=${page}&visibility=public&order_by=last_activity_at&sort=desc`,
      undefined,
    );
    projects.push(...pageProjects);
    if (!hasMorePage(pageProjects)) {
      break;
    }
    page += 1;
  }

  return projects;
}

async function fetchGitlabAccessibleProjects(token: string): Promise<GitlabProject[]> {
  const projects: GitlabProject[] = [];
  let page = 1;

  while (true) {
    const pageProjects = await gitlabFetch<GitlabProject[]>(
      `https://gitlab.com/api/v4/projects?membership=true&per_page=100&page=${page}&order_by=last_activity_at&sort=desc`,
      token,
    );
    projects.push(...pageProjects);
    if (!hasMorePage(pageProjects)) {
      break;
    }
    page += 1;
  }

  return projects;
}

export async function fetchGitlabRepositoryActivity(
  repository: string,
  authorQuery: string,
  token: string | undefined,
  dateWindow: DateWindow,
): Promise<RepoActivity> {
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

export async function fetchGitlabAllActivity(
  targetUser: string,
  authorQuery: string,
  token: string | undefined,
  dateWindow: DateWindow,
  warnings: string[],
): Promise<RepoActivity[]> {
  const projects = token
    ? await fetchGitlabAccessibleProjects(token)
    : await fetchGitlabPublicUserProjects(targetUser);
  const maxProjects = token
    ? readPositiveIntEnv('GITLAB_MAX_AUTH_PROJECTS', DEFAULT_AUTH_PROJECT_SCAN_LIMIT)
    : readPositiveIntEnv('GITLAB_MAX_PUBLIC_PROJECTS', DEFAULT_PUBLIC_PROJECT_SCAN_LIMIT);
  const maxCommitPages = token
    ? readPositiveIntEnv('GITLAB_MAX_AUTH_COMMIT_PAGES', DEFAULT_AUTH_COMMIT_PAGE_LIMIT)
    : readPositiveIntEnv('GITLAB_MAX_PUBLIC_COMMIT_PAGES', DEFAULT_PUBLIC_COMMIT_PAGE_LIMIT);
  const projectsToScan = projects.slice(0, maxProjects);

  if (projects.length > projectsToScan.length) {
    warnings.push(`GitLab: Scanning ${projectsToScan.length} of ${projects.length} projects to reduce API usage.`);
  }
  warnings.push(`GitLab: Commit scan per project is capped to ${maxCommitPages} page(s) for faster serverless responses.`);

  const activities: RepoActivity[] = [];

  for (const project of projectsToScan) {
    try {
      const commits = await fetchGitlabProjectCommits(project.id, token, dateWindow, {
        maxPages: maxCommitPages,
      });
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
    } catch {
      warnings.push(`GitLab: Failed to process ${project.path_with_namespace}.`);
    }
  }

  return activities;
}

