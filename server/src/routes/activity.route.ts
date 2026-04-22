import { Router } from 'express';
import { ActivityRequest, ActivityResponse, ProviderType, RepoActivity } from '../types.js';
import { resolveDateWindow } from '../utils/date.js';
import { fetchGithubAllActivity, fetchGithubRepositoryActivity } from '../utils/github.js';
import { fetchGitlabAllActivity, fetchGitlabRepositoryActivity } from '../utils/gitlab.js';
import { finalizeRepositories, summarizeOverall } from '../utils/normalize.js';

const activityRouter = Router();

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

activityRouter.post('/', async (req, res) => {
  if (!isRequestBody(req.body)) {
    return res.status(400).json({ error: 'Invalid request payload.' });
  }

  const payload = req.body;
  const repository = payload.repository?.trim() ?? '';
  const authorQuery = payload.authorQuery.trim();
  const token = payload.token?.trim() || undefined;

  if (!authorQuery) {
    return res.status(400).json({ error: 'Username or author is required.' });
  }

  const warnings: string[] = [];
  const dateWindow = resolveDateWindow(payload.dateFilter);

  if (!token && !repository) {
    warnings.push('Token not provided: scanning public repositories for the target username only.');
  }

  if (!token && repository) {
    warnings.push('Token not provided: only public access is available for the selected repository.');
  }

  try {
    let repositories: RepoActivity[] = [];

    if (repository) {
      const provider = resolveProvider(repository);
      const repoActivity =
        provider === 'gitlab'
          ? await fetchGitlabRepositoryActivity(repository, authorQuery, token, dateWindow)
          : await fetchGithubRepositoryActivity(repository, authorQuery, token, dateWindow);

      repositories = [repoActivity];
    } else {
      // Blank repository means scan all available repos for target scope.
      const githubActivities = await fetchGithubAllActivity(authorQuery, authorQuery, token, dateWindow, warnings);
      let gitlabActivities: RepoActivity[] = [];

      try {
        gitlabActivities = await fetchGitlabAllActivity(authorQuery, authorQuery, token, dateWindow, warnings);
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

    return res.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch repository activity.';
    return res.status(400).json({ error: message });
  }
});

export { activityRouter };