import { AppState } from '../types/index.js';

const KEY = 'devtrace.preferences.v2';

type SavedPreferences = Pick<
  AppState,
  'repository' | 'authorQuery' | 'summaryStyle' | 'dateFilterMode' | 'specificDate' | 'rangeStart' | 'rangeEnd'
>;

export function loadPreferences(): Partial<SavedPreferences> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Partial<SavedPreferences>;
    return parsed;
  } catch {
    return {};
  }
}

export function savePreferences(state: AppState): void {
  const payload: SavedPreferences = {
    repository: state.repository,
    authorQuery: state.authorQuery,
    summaryStyle: state.summaryStyle,
    dateFilterMode: state.dateFilterMode,
    specificDate: state.specificDate,
    rangeStart: state.rangeStart,
    rangeEnd: state.rangeEnd,
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}