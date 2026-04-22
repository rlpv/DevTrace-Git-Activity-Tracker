import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CommitEntry, DateWindow } from '../types.js';

const execFileAsync = promisify(execFile);

function matchAuthor(commit: CommitEntry, authorQuery: string): boolean {
  const query = authorQuery.trim().toLowerCase();
  if (!query) {
    return true;
  }

  const haystack = [
    commit.author,
    commit.authorEmail ?? '',
    commit.sourceMeta?.username ?? '',
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
}

function parseGitLog(output: string): CommitEntry[] {
  return output
    .split('\u001e')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const lines = chunk.split('\n');
      const [hash = '', author = '', email = '', date = '', message = ''] = lines[0]?.split('\u001f') ?? [];
      const files = lines.slice(1).map((line) => line.trim()).filter(Boolean);

      return {
        hash,
        author,
        authorEmail: email,
        date,
        message,
        files: files.length > 0 ? files : undefined,
      };
    })
    .filter((commit) => Boolean(commit.hash));
}

export async function readLocalRepoCommits(
  repoPath: string,
  authorQuery: string,
  dateWindow: DateWindow,
): Promise<CommitEntry[]> {
  const args = [
    '-C',
    repoPath,
    'log',
    '--all',
    '--date=iso-strict',
    '--pretty=format:%H%x1f%an%x1f%ae%x1f%ad%x1f%s%x1e',
    '--name-only',
  ];

  if (dateWindow.since) {
    args.push(`--since=${dateWindow.since}`);
  }
  if (dateWindow.until) {
    args.push(`--until=${dateWindow.until}`);
  }

  const { stdout } = await execFileAsync('git', args, {
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 20,
  });

  return parseGitLog(stdout).filter((commit) => matchAuthor(commit, authorQuery));
}