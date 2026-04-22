export type SummaryStyle = 'short' | 'professional' | 'detailed' | 'standup';
export type DateFilterMode = 'specific' | 'range';
export type ProviderType = 'github' | 'gitlab';

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
}

export interface AppState {
  repository: string;
  authorQuery: string;
  summaryStyle: SummaryStyle;
  dateFilterMode: DateFilterMode;
  specificDate: string;
  rangeStart: string;
  rangeEnd: string;
}