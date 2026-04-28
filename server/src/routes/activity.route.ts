import { Response, Router } from 'express';
import { ActivityRequest, ActivityResponse, ProviderType, RepoActivity } from '../types.js';
import { resolveDateWindow } from '../utils/date.js';
import { fetchGithubAllActivity, fetchGithubRepositoryActivity, GitHubApiError } from '../utils/github.js';
import { fetchGitlabAllActivity, fetchGitlabRepositoryActivity } from '../utils/gitlab.js';
import { isIdentityMode } from '../utils/identity.js';
import { finalizeRepositories, summarizeOverall } from '../utils/normalize.js';

const activityRouter = Router();

interface StructuredErrorResponse {
  success: false;
  code: string;
  message: string;
  details?: {
    resetAt?: string;
  };
  error: string;
}

function sendStructuredError(
  res: Response,
  status: number,
  code: string,
  message: string,
  resetAt?: string,
) {
  const payload: StructuredErrorResponse = {
    success: false,
    code,
    message,
    details: resetAt ? { resetAt } : undefined,
    error: message,
  };
  return res.status(status).json(payload);
}

function isRequestBody(body: unknown): body is ActivityRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Partial<ActivityRequest>;
  return (
    typeof candidate.authorQuery === 'string' &&
    typeof candidate.summaryStyle === 'string' &&
    Boolean(candidate.dateFilter && typeof candidate.dateFilter === 'object')
  );
}

function resolveProvider(repository: string): ProviderType {
  const normalized = repository.trim().toLowerCase();

  if (normalized.includes('gitlab.com')) {
    return 'gitlab';
  }

  return 'github';
}

function parseRepositoryList(repositoryInput: string): string[] {
  const items = repositoryInput
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const unique: string[] = [];

  for (const item of items) {
    const key = item
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '')
      .replace(/\.git$/i, '');

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(item);
  }

  return unique;
}

activityRouter.post('/', async (req, res) => {
  if (!isRequestBody(req.body)) {
    return sendStructuredError(res, 400, 'INVALID_REQUEST', 'Invalid request payload.');
  }

  const payload = req.body;
  const repository = payload.repository?.trim() ?? '';
  const repositoryList = parseRepositoryList(repository);
  const authorQuery = payload.authorQuery.trim();
  const token = payload.token?.trim() || undefined;
  const identityMode = isIdentityMode(payload.identityMode) ? payload.identityMode : 'author-only';
  const excludeMergeCommits = Boolean(payload.excludeMergeCommits);

  if (!authorQuery) {
    return sendStructuredError(res, 400, 'INVALID_AUTHOR_QUERY', 'Username or author is required.');
  }

  const warnings: string[] = [];
  const dateWindow = resolveDateWindow(payload.dateFilter);

  if (!token && !repository) {
    warnings.push('Token not provided: scanning public repositories for the target username only.');
  }

  if (!token && repositoryList.length > 0) {
    warnings.push('Token not provided: only public access is available for the selected repository.');
  }

  try {
    let repositories: RepoActivity[] = [];

    if (repositoryList.length > 0) {
      for (const repoInput of repositoryList) {
        try {
          const provider = resolveProvider(repoInput);
          const repoActivity = provider === 'gitlab'
            ? await fetchGitlabRepositoryActivity(repoInput, authorQuery, token, dateWindow, identityMode, excludeMergeCommits)
            : await fetchGithubRepositoryActivity(repoInput, authorQuery, token, dateWindow, identityMode, excludeMergeCommits);
          repositories.push(repoActivity);
        } catch {
          warnings.push(`Repository skipped: ${repoInput}`);
        }
      }
    } else {
      const githubActivities = await fetchGithubAllActivity(authorQuery, authorQuery, token, dateWindow, warnings, identityMode, excludeMergeCommits);
      let gitlabActivities: RepoActivity[] = [];

      try {
        gitlabActivities = await fetchGitlabAllActivity(authorQuery, authorQuery, token, dateWindow, warnings, identityMode, excludeMergeCommits);
      } catch {
        warnings.push('GitLab user scan was skipped or unavailable for the target.');
      }

      repositories = [...githubActivities, ...gitlabActivities];
    }

    const finalRepositories = finalizeRepositories(repositories, payload.summaryStyle).filter((repo) => repo.commitCount > 0);

    const response: ActivityResponse = {
      repository,
      authorQuery,
      totalCommitCount: finalRepositories.reduce((total, repo) => total + repo.commitCount, 0),
      repoCount: finalRepositories.length,
      repositories: finalRepositories,
      overallSummary: summarizeOverall(finalRepositories, payload.summaryStyle),
      warnings: warnings.length > 0 ? warnings : undefined,
    };

    return res.json({
      success: true,
      ...response,
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return sendStructuredError(res, error.status, error.code, error.message, error.resetAt);
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch repository activity.';
    return sendStructuredError(res, 400, 'ACTIVITY_FETCH_FAILED', message);
  }
});

export { activityRouter };
