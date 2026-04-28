import { Response, Router } from 'express';
import { ReportGenerateRequest, ReportGenerateResponse, RepoActivity, SummaryStyle } from '../types.js';
import { generateGeminiReport } from '../utils/gemini.js';
import { commitMatchesIdentity, isIdentityMode, isMergeCommitMessage } from '../utils/identity.js';
import { buildReportPrompt } from '../utils/reportPrompt.js';

const reportRouter = Router();

interface StructuredErrorResponse {
  success: false;
  code: string;
  message: string;
  error: string;
}

function sendStructuredError(
  res: Response,
  status: number,
  code: string,
  message: string,
) {
  const payload: StructuredErrorResponse = {
    success: false,
    code,
    message,
    error: message,
  };
  return res.status(status).json(payload);
}

function isSummaryStyle(value: unknown): value is SummaryStyle {
  return value === 'short' || value === 'professional' || value === 'standup' || value === 'detailed';
}

function isRequestBody(body: unknown): body is ReportGenerateRequest {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const candidate = body as Partial<ReportGenerateRequest>;
  return typeof candidate.authorQuery === 'string' && Array.isArray(candidate.repositories);
}

function enforceAuthorCommitScope(
  authorQuery: string,
  repositories: RepoActivity[],
  identityMode: 'author-only' | 'committer-only' | 'author-or-committer',
  excludeMergeCommits: boolean,
): RepoActivity[] {
  return repositories
    .map((repo) => {
      const commits = repo.commits.filter((commit) => {
        if (excludeMergeCommits && isMergeCommitMessage(commit.message)) {
          return false;
        }
        return commitMatchesIdentity(commit, authorQuery, identityMode);
      });
      return {
        ...repo,
        commits,
        commitCount: commits.length,
      };
    })
    .filter((repo) => repo.commitCount > 0);
}

reportRouter.post('/generate', async (req, res) => {
  if (!isRequestBody(req.body)) {
    return sendStructuredError(res, 400, 'INVALID_REQUEST', 'Invalid request payload.');
  }

  const payload = req.body;
  const authorQuery = payload.authorQuery.trim();
  const identityMode = isIdentityMode(payload.identityMode) ? payload.identityMode : 'author-only';
  const excludeMergeCommits = Boolean(payload.excludeMergeCommits);
  const repositories = enforceAuthorCommitScope(authorQuery, payload.repositories, identityMode, excludeMergeCommits);
  const style: SummaryStyle = isSummaryStyle(payload.style) ? payload.style : 'professional';
  const dateLabel = payload.dateLabel?.trim();

  if (!authorQuery) {
    return sendStructuredError(res, 400, 'INVALID_AUTHOR_QUERY', 'Username or author is required.');
  }
  if (repositories.length === 0) {
    return sendStructuredError(res, 400, 'NO_MATCHING_COMMITS', 'No commits match the requested author identity.');
  }

  try {
    const prompt = buildReportPrompt({
      authorQuery,
      repositories,
      style,
      dateLabel,
    });
    const report = await generateGeminiReport(prompt);

    const response: ReportGenerateResponse = { report };
    return res.json({ success: true, ...response });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Report generation failed.';
    return sendStructuredError(res, 500, 'REPORT_GENERATION_FAILED', message);
  }
});

export { reportRouter };
