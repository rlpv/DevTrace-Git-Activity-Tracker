import { CommitEntry, DateWindow, IdentityMode, RepoActivity } from '../types.js';
import { commitMatchesIdentity, isMergeCommitMessage } from './identity.js';

export type GitHubErrorCode =
  | 'GITHUB_INVALID_TOKEN'
  | 'GITHUB_PUBLIC_RATE_LIMIT'
  | 'GITHUB_AUTH_RATE_LIMIT'
  | 'GITHUB_FORBIDDEN'
  | 'GITHUB_NOT_FOUND'
  | 'GITHUB_PRIVATE_REPO_REQUIRES_TOKEN';

export class GitHubApiError extends Error {
  readonly code: GitHubErrorCode;
  readonly status: number;
  readonly resetAt?: string;

  constructor(code: GitHubErrorCode, message: string, status: number, resetAt?: string) {
    super(message);
    this.code = code;
    this.status = status;
    this.resetAt = resetAt;
  }
}

interface GithubCommitItem {
  sha: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer?: {
      name?: string;
      email?: string;
    };
    message: string;
  };
  author: {
    login: string;
  } | null;
  committer: {
    login: string;
  } | null;
}

interface GithubRepoInfo {
  name: string;
  full_name: string;
  html_url: string;
}

const DEFAULT_PUBLIC_REPO_SCAN_LIMIT = 8;
const DEFAULT_AUTH_REPO_SCAN_LIMIT = 30;
const DEFAULT_PUBLIC_COMMIT_PAGE_LIMIT = 2;
const DEFAULT_AUTH_COMMIT_PAGE_LIMIT = 3;

function hasMorePage<T>(items: T[]): boolean {
  return items.length === 100;
}

function normalizeGithubRepo(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }

  const sshMatch = trimmed.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  // Accept URL variants like:
  // - https://github.com/owner/repo
  // - https://github.com/owner/repo/
  // - https://github.com/owner/repo/tree/main
  // - https://www.github.com/owner/repo.git
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host === 'github.com' || host === 'www.github.com') {
        const [owner, repoRaw] = parsed.pathname.split('/').filter(Boolean);
        if (owner && repoRaw) {
          const repo = repoRaw.replace(/\.git$/i, '');
          if (repo) {
            return `${owner}/${repo}`;
          }
        }
      }
    } catch {
      // Fall through to slug parsing.
    }
  }

  const slugMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
  if (slugMatch) {
    return `${slugMatch[1]}/${slugMatch[2].replace(/\.git$/i, '')}`;
  }

  return undefined;
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

function parseResetAt(resetHeaderValue: string | null): string | undefined {
  if (!resetHeaderValue) {
    return undefined;
  }

  const epoch = Number(resetHeaderValue);
  if (Number.isNaN(epoch)) {
    return undefined;
  }

  return new Date(epoch * 1000).toISOString();
}

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

function isGithubRateLimitError(error: unknown): error is GitHubApiError {
  return (
    error instanceof GitHubApiError &&
    (error.code === 'GITHUB_PUBLIC_RATE_LIMIT' || error.code === 'GITHUB_AUTH_RATE_LIMIT')
  );
}

function resolveGithubAuthorParam(authorQuery: string): string | undefined {
  const candidate = authorQuery.trim();
  if (!candidate) {
    return undefined;
  }

  // GitHub commit-list `author` accepts login or email. Skip full-name style queries.
  if (candidate.includes(' ')) {
    return undefined;
  }

  return candidate;
}

function buildGithubError(
  status: number,
  tokenProvided: boolean,
  remaining: string | null,
  resetAt: string | undefined,
  apiMessage: string,
  repoInfoWithoutToken: boolean,
): GitHubApiError {
  if (status === 401) {
    return new GitHubApiError(
      'GITHUB_INVALID_TOKEN',
      'GitHub token is invalid or expired.',
      401,
      resetAt,
    );
  }

  if (status === 403) {
    const rateLimited =
      remaining === '0' ||
      apiMessage.includes('rate limit') ||
      apiMessage.includes('abuse detection');

    if (rateLimited) {
      return new GitHubApiError(
        tokenProvided ? 'GITHUB_AUTH_RATE_LIMIT' : 'GITHUB_PUBLIC_RATE_LIMIT',
        tokenProvided
          ? 'GitHub authenticated rate limit exceeded.'
          : 'GitHub public rate limit exceeded.',
        403,
        resetAt,
      );
    }

    return new GitHubApiError(
      'GITHUB_FORBIDDEN',
      'GitHub request is forbidden for the current access scope.',
      403,
      resetAt,
    );
  }

  if (status === 404) {
    if (repoInfoWithoutToken) {
      return new GitHubApiError(
        'GITHUB_PRIVATE_REPO_REQUIRES_TOKEN',
        'Private repository access requires a GitHub token.',
        404,
        resetAt,
      );
    }

    return new GitHubApiError(
      'GITHUB_NOT_FOUND',
      'GitHub resource was not found.',
      404,
      resetAt,
    );
  }

  return new GitHubApiError(
    'GITHUB_FORBIDDEN',
    'GitHub request failed.',
    status,
    resetAt,
  );
}

async function githubFetch<T>(
  url: string,
  token?: string,
  context?: { repoInfoWithoutToken?: boolean },
): Promise<T> {
  const response = await fetch(url, {
    headers: buildGithubHeaders(token),
  });

  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetAt = parseResetAt(response.headers.get('x-ratelimit-reset'));
    const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;
    const apiMessage = responseBody?.message?.toLowerCase() ?? '';

    throw buildGithubError(
      response.status,
      Boolean(token),
      remaining,
      resetAt,
      apiMessage,
      Boolean(context?.repoInfoWithoutToken),
    );
  }

  return (await response.json()) as T;
}

async function fetchGithubRepoInfo(repoFullName: string, token?: string): Promise<GithubRepoInfo> {
  return githubFetch<GithubRepoInfo>(
    `https://api.github.com/repos/${repoFullName}`,
    token,
    { repoInfoWithoutToken: !token },
  );
}

async function fetchGithubRepoCommits(
  repoFullName: string,
  token: string | undefined,
  dateWindow: DateWindow,
  authorQuery?: string,
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
    const authorParam = resolveGithubAuthorParam(authorQuery ?? '');
    if (authorParam) {
      params.set('author', authorParam);
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
          committer: commit.commit.committer?.name,
          committerEmail: commit.commit.committer?.email,
          committerUsername: commit.committer?.login,
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
  identityMode: IdentityMode = 'author-only',
  excludeMergeCommits = false,
): Promise<RepoActivity> {
  const repoFullName = normalizeGithubRepo(repository);
  if (!repoFullName) {
    throw new Error('For GitHub, repository must be in owner/repo or https://github.com/owner/repo format.');
  }

  const repoInfo = await fetchGithubRepoInfo(repoFullName, token);
  const commits = await fetchGithubRepoCommits(repoInfo.full_name, token, dateWindow, authorQuery);
  const filtered = commits.filter((commit) => {
    if (excludeMergeCommits && isMergeCommitMessage(commit.message)) {
      return false;
    }
    return commitMatchesIdentity(commit, authorQuery, identityMode);
  });

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
  identityMode: IdentityMode = 'author-only',
  excludeMergeCommits = false,
): Promise<RepoActivity[]> {
  const repos = token
    ? await fetchGithubAccessibleRepos(token)
    : await fetchGithubPublicUserRepos(targetUser);
  const maxRepos = token
    ? readPositiveIntEnv('GITHUB_MAX_AUTH_REPOS', DEFAULT_AUTH_REPO_SCAN_LIMIT)
    : readPositiveIntEnv('GITHUB_MAX_PUBLIC_REPOS', DEFAULT_PUBLIC_REPO_SCAN_LIMIT);
  const maxCommitPages = token
    ? readPositiveIntEnv('GITHUB_MAX_AUTH_COMMIT_PAGES', DEFAULT_AUTH_COMMIT_PAGE_LIMIT)
    : readPositiveIntEnv('GITHUB_MAX_PUBLIC_COMMIT_PAGES', DEFAULT_PUBLIC_COMMIT_PAGE_LIMIT);
  const reposToScan = repos.slice(0, maxRepos);

  if (repos.length > reposToScan.length) {
    warnings.push(`GitHub: Scanning ${reposToScan.length} of ${repos.length} repositories to reduce API usage.`);
  }
  warnings.push(`GitHub: Commit scan per repository is capped to ${maxCommitPages} page(s) for faster serverless responses.`);

  const activities: RepoActivity[] = [];

  for (const repo of reposToScan) {
    try {
      const commits = await fetchGithubRepoCommits(repo.full_name, token, dateWindow, authorQuery, {
        maxPages: maxCommitPages,
      });
      const filtered = commits.filter((commit) => {
        if (excludeMergeCommits && isMergeCommitMessage(commit.message)) {
          return false;
        }
        return commitMatchesIdentity(commit, authorQuery, identityMode);
      });

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
    } catch (error) {
      if (isGithubRateLimitError(error)) {
        const resetNote = error.resetAt ? ` Reset at ${error.resetAt}.` : '';
        warnings.push(`GitHub rate limit reached while scanning repositories.${resetNote} Add a token or narrow repository/date filters.`);
        break;
      }

      warnings.push(`GitHub: Failed to process ${repo.full_name}.`);
    }
  }

  return activities;
}

