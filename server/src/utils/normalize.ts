import { CommitEntry, RepoActivity, SummaryStyle } from '../types.js';

function sentenceCase(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function cleanCommitMessage(message: string): string {
  const firstLine = message.split('\n')[0]?.trim() ?? '';
  if (!firstLine) {
    return 'Updated project files';
  }

  const normalized = firstLine
    .replace(/^(feat|fix|chore|docs|style|refactor|test|build|ci)(\(.+?\))?:\s*/i, '')
    .replace(/^merge\s.+/i, 'Merged branch changes')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.]+$/, '');

  return sentenceCase(normalized || firstLine);
}

function uniqueCommitIntents(commits: CommitEntry[], limit: number): string[] {
  const unique = new Map<string, string>();

  for (const commit of commits) {
    const clean = cleanCommitMessage(commit.message);
    const key = clean.toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, clean);
    }
    if (unique.size >= limit) {
      break;
    }
  }

  return Array.from(unique.values());
}

function dateSpan(commits: CommitEntry[]): string {
  if (commits.length === 0) {
    return 'No dates available';
  }
  const sorted = [...commits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const start = new Date(sorted[0].date).toLocaleDateString();
  const end = new Date(sorted[sorted.length - 1].date).toLocaleDateString();
  return start === end ? start : `${start} to ${end}`;
}

export function summarizeRepo(repo: RepoActivity, style: SummaryStyle): string {
  if (repo.commits.length === 0) {
    return 'No matching commits found for this repository.';
  }

  const intents = uniqueCommitIntents(repo.commits, style === 'detailed' ? 8 : 4);

  if (style === 'short') {
    return intents.map((intent) => `- ${intent}`).join('\n');
  }

  if (style === 'professional') {
    return intents.map((intent) => `- ${intent}.`).join('\n');
  }

  if (style === 'standup') {
    const focus = intents.slice(0, 3).join(', ').toLowerCase();
    return `I made ${repo.commitCount} commit${repo.commitCount === 1 ? '' : 's'} in ${repo.repoName}, mainly focused on ${focus}.`;
  }

  const lines = [
    `Repository: ${repo.repoName}`,
    `Commit count: ${repo.commitCount}`,
    `Date span: ${dateSpan(repo.commits)}`,
    'Key work:',
    ...intents.map((intent) => `- ${intent}`),
  ];

  return lines.join('\n');
}

export function summarizeOverall(repositories: RepoActivity[], style: SummaryStyle): string {
  const allCommits = repositories.flatMap((repo) => repo.commits);
  if (allCommits.length === 0) {
    return 'No matching commits found.';
  }

  const intents = uniqueCommitIntents(allCommits, style === 'detailed' ? 10 : 5);
  const totalCommits = allCommits.length;
  const repoCount = repositories.length;

  if (style === 'short') {
    const headline = `- Worked across ${repoCount} repos with ${totalCommits} matching commit${totalCommits === 1 ? '' : 's'}.`;
    return [headline, ...intents.slice(0, 4).map((intent) => `- ${intent}`)].join('\n');
  }

  if (style === 'professional') {
    return [
      `- Completed ${totalCommits} matching commits across ${repoCount} repositories.`,
      ...intents.slice(0, 5).map((intent) => `- ${intent}.`),
    ].join('\n');
  }

  if (style === 'standup') {
    const topRepos = [...repositories]
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, 3)
      .map((repo) => repo.repoName)
      .join(', ');
    return `I worked across ${repoCount} repositories with ${totalCommits} matching commits. Most activity was in ${topRepos}. Key themes included ${intents
      .slice(0, 3)
      .join(', ')
      .toLowerCase()}.`;
  }

  const lines = [
    `Overall activity report`,
    `Total repositories: ${repoCount}`,
    `Total matching commits: ${totalCommits}`,
    `Date span: ${dateSpan(allCommits)}`,
    'Key work themes:',
    ...intents.map((intent) => `- ${intent}`),
  ];

  return lines.join('\n');
}

export function finalizeRepositories(repositories: RepoActivity[], style: SummaryStyle): RepoActivity[] {
  return repositories
    .map((repo) => {
      const sortedCommits = [...repo.commits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return {
        ...repo,
        commits: sortedCommits,
        commitCount: sortedCommits.length,
      };
    })
    .sort((a, b) => b.commitCount - a.commitCount)
    .map((repo) => ({
      ...repo,
      summary: summarizeRepo(repo, style),
    }));
}
