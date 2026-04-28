import { CommitEntry, IdentityMode } from '../types.js';

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, '');
}

function matchesToken(query: string, identity: string): boolean {
  if (identity === query) {
    return true;
  }
  const atIndex = identity.indexOf('@');
  return atIndex > 0 && identity.slice(0, atIndex) === query;
}

function authorIdentities(commit: CommitEntry): string[] {
  return [
    commit.sourceMeta?.username ?? '',
    commit.authorEmail ?? '',
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
}

function committerIdentities(commit: CommitEntry): string[] {
  return [
    commit.sourceMeta?.committer ?? '',
    commit.sourceMeta?.committerEmail ?? '',
    commit.sourceMeta?.committerUsername ?? '',
  ]
    .map(normalizeIdentity)
    .filter(Boolean);
}

export function isIdentityMode(value: unknown): value is IdentityMode {
  return value === 'author-only' || value === 'committer-only' || value === 'author-or-committer';
}

export function commitMatchesIdentity(
  commit: CommitEntry,
  authorQuery: string,
  identityMode: IdentityMode,
): boolean {
  const query = normalizeIdentity(authorQuery);
  if (!query) {
    return false;
  }

  const identities = identityMode === 'author-only'
    ? authorIdentities(commit)
    : identityMode === 'committer-only'
      ? committerIdentities(commit)
      : [...authorIdentities(commit), ...committerIdentities(commit)];

  return identities.some((identity) => matchesToken(query, identity));
}

export function isMergeCommitMessage(message: string): boolean {
  const head = message.split('\n')[0]?.trim().toLowerCase() ?? '';
  return head.startsWith('merge ');
}
