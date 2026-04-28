import { RepoActivity, SummaryStyle } from '../types.js';

const MAX_REPOS = 20;
const MAX_COMMITS_PER_REPO = 40;

interface PromptInput {
  authorQuery: string;
  repositories: RepoActivity[];
  style: SummaryStyle;
  dateLabel?: string;
}

function commitLines(repo: RepoActivity): string[] {
  return repo.commits.slice(0, MAX_COMMITS_PER_REPO).map((commit) => {
    const [headline, ...bodyParts] = commit.message.split('\n');
    const description = bodyParts.join('\n').trim();
    const descSuffix = description ? ` | description: ${description}` : '';
    return `- ${commit.date} | ${commit.hash} | ${headline}${descSuffix}`;
  });
}

export function buildReportPrompt(input: PromptInput): string {
  const repos = input.repositories.slice(0, MAX_REPOS);
  const dataset = repos.map((repo) => ({
    repoName: repo.repoName,
    repoPathOrUrl: repo.repoPathOrUrl,
    provider: repo.provider,
    commitCount: repo.commitCount,
    commits: commitLines(repo),
  }));

  return [
    'You are generating a software work report from verified commit data.',
    'Strict rules:',
    '- The dataset was already filtered by the backend for the requested author. Treat all listed commits as belonging to that author for this report.',
    '- Use only the provided dataset.',
    '- Do not infer extra tasks, tickets, incidents, impact, or business outcomes.',
    '- If data is missing, say that briefly instead of inventing details.',
    '- Keep repository names, dates, and technical details grounded in the dataset.',
    '',
    `Requested style: ${input.style}`,
    `Author query: ${input.authorQuery}`,
    `Date label: ${input.dateLabel ?? 'Not provided'}`,
    '',
    'Output format:',
    '- Return plain text only.',
    '- Start with a concise headline sentence.',
    '- Then provide a repository-by-repository summary.',
    '- End with key themes and concrete next-step suggestions based on commits only.',
    '',
    'Dataset (JSON):',
    JSON.stringify(dataset, null, 2),
  ].join('\n');
}
