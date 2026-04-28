export type SummaryStyle = 'short' | 'professional' | 'detailed' | 'standup';
export type DateFilterMode = 'specific' | 'range';
export type ProviderType = 'github' | 'gitlab';
export type IdentityMode = 'author-only' | 'committer-only' | 'author-or-committer';

export interface DateFilter {
  mode: DateFilterMode;
  specificDate?: string;
  startDate?: string;
  endDate?: string;
}

export interface CommitEntry {
  hash: string;
  message: string;
  author: string;
  authorEmail?: string;
  date: string;
  files?: string[];
  sourceMeta?: {
    username?: string;
    committer?: string;
    committerEmail?: string;
    committerUsername?: string;
  };
}

export interface RepoActivity {
  repoName: string;
  repoPathOrUrl: string;
  source: 'remote';
  provider: ProviderType;
  commitCount: number;
  commits: CommitEntry[];
  summary: string;
}

export interface ActivityResponse {
  repository: string;
  authorQuery: string;
  totalCommitCount: number;
  repoCount: number;
  repositories: RepoActivity[];
  overallSummary: string;
  warnings?: string[];
}

export interface ActivityRequest {
  repository: string;
  authorQuery: string;
  token?: string;
  dateFilter: DateFilter;
  summaryStyle: SummaryStyle;
  identityMode?: IdentityMode;
  excludeMergeCommits?: boolean;
}

export interface ReportGenerateRequest {
  authorQuery: string;
  repositories: RepoActivity[];
  style?: SummaryStyle;
  dateLabel?: string;
  identityMode?: IdentityMode;
  excludeMergeCommits?: boolean;
}

export interface ReportGenerateResponse {
  report: string;
}

export interface DateWindow {
  since?: string;
  until?: string;
}

export interface RepoScanResult {
  repoName: string;
  repoPath: string;
}
