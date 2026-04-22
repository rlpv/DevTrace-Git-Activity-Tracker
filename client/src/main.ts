import './styles.css';
import { ActivityRequest, ActivityResponse, AppState, DateFilter, RepoActivity } from './types/index.js';
import { escapeHtml, formatDate, shortHash } from './utils/format.js';
import { loadPreferences, savePreferences } from './utils/storage.js';
import { dateModeLabel, summaryStyleLabel } from './utils/summary.js';

const env = (import.meta as ImportMeta & { env: { VITE_API_BASE_URL?: string } }).env;
const API_BASE_URL = env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const defaultState: AppState = {
  repository: '',
  authorQuery: '',
  summaryStyle: 'professional',
  dateFilterMode: 'specific',
  specificDate: '',
  rangeStart: '',
  rangeEnd: '',
};

const stored = loadPreferences();
const state: AppState = {
  ...defaultState,
  ...stored,
};

const form = document.querySelector<HTMLFormElement>('#activityForm');
const repositoryInput = document.querySelector<HTMLInputElement>('#repository');
const authorInput = document.querySelector<HTMLInputElement>('#authorQuery');
const tokenInput = document.querySelector<HTMLInputElement>('#token');
const summaryStyleSelect = document.querySelector<HTMLSelectElement>('#summaryStyle');
const dateFilterModeSelect = document.querySelector<HTMLSelectElement>('#dateFilterMode');
const specificDateInput = document.querySelector<HTMLInputElement>('#specificDate');
const rangeStartInput = document.querySelector<HTMLInputElement>('#rangeStart');
const rangeEndInput = document.querySelector<HTMLInputElement>('#rangeEnd');

const specificDateSection = document.querySelector<HTMLElement>('[data-date-block="specific"]');
const rangeDateSection = document.querySelector<HTMLElement>('[data-date-block="range"]');
const statusNode = document.querySelector<HTMLElement>('#status');
const warningsNode = document.querySelector<HTMLElement>('#warnings');
const outputNode = document.querySelector<HTMLElement>('#output');

function assertNode<T>(node: T | null, name: string): T {
  if (!node) {
    throw new Error(`Missing required node: ${name}`);
  }
  return node;
}

const ui = {
  form: assertNode(form, '#activityForm'),
  repositoryInput: assertNode(repositoryInput, '#repository'),
  authorInput: assertNode(authorInput, '#authorQuery'),
  tokenInput: assertNode(tokenInput, '#token'),
  summaryStyleSelect: assertNode(summaryStyleSelect, '#summaryStyle'),
  dateFilterModeSelect: assertNode(dateFilterModeSelect, '#dateFilterMode'),
  specificDateInput: assertNode(specificDateInput, '#specificDate'),
  rangeStartInput: assertNode(rangeStartInput, '#rangeStart'),
  rangeEndInput: assertNode(rangeEndInput, '#rangeEnd'),
  specificDateSection: assertNode(specificDateSection, '[data-date-block="specific"]'),
  rangeDateSection: assertNode(rangeDateSection, '[data-date-block="range"]'),
  statusNode: assertNode(statusNode, '#status'),
  warningsNode: assertNode(warningsNode, '#warnings'),
  outputNode: assertNode(outputNode, '#output'),
};

function renderInfoCard(title: string, message: string, tone: 'neutral' | 'error' = 'neutral'): void {
  const toneClasses =
    tone === 'error'
      ? 'border-rose-800 bg-rose-950/40 text-rose-200'
      : 'border-[#30363d] bg-[#0f141b] text-slate-300';

  ui.outputNode.innerHTML = `
    <section class="grid min-h-[320px] place-items-center">
      <div class="w-full max-w-xl rounded-2xl border p-8 text-center ${toneClasses}">
        <h3 class="m-0 text-xl font-semibold">${escapeHtml(title)}</h3>
        <p class="mt-2 text-sm">${escapeHtml(message)}</p>
      </div>
    </section>
  `;
}

function syncFormFromState(): void {
  ui.repositoryInput.value = state.repository;
  ui.authorInput.value = state.authorQuery;
  ui.summaryStyleSelect.value = state.summaryStyle;
  ui.dateFilterModeSelect.value = state.dateFilterMode;
  ui.specificDateInput.value = state.specificDate;
  ui.rangeStartInput.value = state.rangeStart;
  ui.rangeEndInput.value = state.rangeEnd;
  syncVisibility();
}

function syncVisibility(): void {
  const specificMode = state.dateFilterMode === 'specific';
  ui.specificDateSection.hidden = !specificMode;
  ui.rangeDateSection.hidden = specificMode;

  ui.specificDateInput.required = specificMode;
  ui.rangeStartInput.required = !specificMode;
  ui.rangeEndInput.required = !specificMode;
}

function applyDateConstraints(): void {
  const today = new Date().toISOString().slice(0, 10);
  ui.specificDateInput.max = today;
  ui.rangeStartInput.max = today;
  ui.rangeEndInput.max = today;
}

function updateStateAndPersist(): void {
  state.repository = ui.repositoryInput.value.trim();
  state.authorQuery = ui.authorInput.value.trim();
  state.summaryStyle = ui.summaryStyleSelect.value as AppState['summaryStyle'];
  state.dateFilterMode = ui.dateFilterModeSelect.value as AppState['dateFilterMode'];
  state.specificDate = ui.specificDateInput.value;
  state.rangeStart = ui.rangeStartInput.value;
  state.rangeEnd = ui.rangeEndInput.value;

  savePreferences(state);
  syncVisibility();
}

function buildDateFilter(): DateFilter {
  if (state.dateFilterMode === 'specific') {
    return {
      mode: 'specific',
      specificDate: state.specificDate,
    };
  }
  return {
    mode: 'range',
    startDate: state.rangeStart,
    endDate: state.rangeEnd,
  };
}

function renderWarnings(warnings?: string[]): void {
  if (!warnings || warnings.length === 0) {
    ui.warningsNode.innerHTML = '';
    ui.warningsNode.hidden = true;
    return;
  }

  ui.warningsNode.hidden = false;
  ui.warningsNode.innerHTML = `
    <h3 class="m-0 text-sm font-semibold text-amber-300">Warnings</h3>
    <ul class="mt-1 list-disc pl-5 text-sm text-amber-100">
      ${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}
    </ul>
  `;
}

function repoMeta(repo: RepoActivity): string {
  return `Source: ${repo.source} | Provider: ${repo.provider} | Commits: ${repo.commitCount}`;
}

function renderRepo(repo: RepoActivity, index: number): string {
  return `
    <article class="rounded-xl border border-[#30363d] bg-[#0f141b] p-3">
      <header class="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h3 class="m-0 text-base font-semibold">${escapeHtml(repo.repoName)}</h3>
          <p class="mt-1 text-xs text-slate-400">${escapeHtml(repoMeta(repo))}</p>
          <p class="mt-1 break-all text-xs text-slate-500">${escapeHtml(repo.repoPathOrUrl)}</p>
        </div>
        <button type="button" class="btn-secondary" data-copy="repo" data-repo-index="${index}">Copy Repo Summary</button>
      </header>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Repository Summary</h4>
        <pre class="summary-pre mt-2">${escapeHtml(repo.summary)}</pre>
      </section>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Matching Commits</h4>
        <ul class="scroll-thin mt-2 grid max-h-64 gap-2 overflow-auto pr-1">
          ${repo.commits
            .map((commit) => {
              const files = commit.files && commit.files.length > 0
                ? `<p class="mt-1 text-xs text-slate-500">Files: ${escapeHtml(commit.files.slice(0, 12).join(', '))}</p>`
                : '';

              return `
                <li class="rounded-lg border border-[#30363d] bg-[#161b22] p-2">
                  <div class="flex items-center justify-between gap-2 text-xs text-slate-300">
                    <strong>${escapeHtml(shortHash(commit.hash))}</strong>
                    <span>${escapeHtml(formatDate(commit.date))}</span>
                  </div>
                  <p class="mt-1 text-sm">${escapeHtml(commit.message)}</p>
                  <p class="mt-1 text-xs text-slate-400">Author: ${escapeHtml(commit.author)}${commit.authorEmail ? ` (${escapeHtml(commit.authorEmail)})` : ''}</p>
                  ${files}
                </li>
              `;
            })
            .join('')}
        </ul>
      </section>
    </article>
  `;
}

function renderResult(response: ActivityResponse): void {
  if (response.totalCommitCount === 0 || response.repositories.length === 0) {
    ui.outputNode.innerHTML = `
      <section class="grid min-h-[320px] place-items-center">
        <div class="w-full max-w-xl rounded-2xl border border-[#30363d] bg-[#0f141b] p-8 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#30363d] bg-[#161b22] text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M9 3H5a2 2 0 0 0-2 2v4" />
              <path d="M3 9l3-3 3 3" />
              <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
              <path d="M21 15l-3 3-3-3" />
              <path d="M7 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              <path d="M17 19a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
            </svg>
          </div>
          <h3 class="m-0 text-xl font-semibold">No matching commits found</h3>
          <p class="mt-2 text-sm text-slate-400">Try a different username/author, date selection, or repository scope.</p>
        </div>
      </section>
    `;
    return;
  }

  ui.outputNode.innerHTML = `
    <section class="rounded-xl border border-[#30363d] bg-[#0f141b] p-3">
      <header class="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h3 class="m-0 text-base font-semibold">Overall Summary</h3>
          <p class="mt-1 text-xs text-slate-400">${escapeHtml(`Repository: ${response.repository || 'All available repositories for target'} | Commits: ${response.totalCommitCount} | Style: ${summaryStyleLabel(state.summaryStyle)} | Date: ${dateModeLabel(state.dateFilterMode)}`)}</p>
        </div>
        <button type="button" class="btn-primary" data-copy="overall">Copy Overall Summary</button>
      </header>
      <pre class="summary-pre mt-2">${escapeHtml(response.overallSummary)}</pre>
    </section>
    <section class="grid gap-3 ${response.repositories.length === 1 ? 'grid-cols-1' : 'grid-cols-1 2xl:grid-cols-2'}">
      ${response.repositories.map((repo, index) => renderRepo(repo, index)).join('')}
    </section>
  `;

  wireCopyButtons(response);
}

async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function wireCopyButtons(response: ActivityResponse): void {
  const buttons = ui.outputNode.querySelectorAll<HTMLButtonElement>('[data-copy]');

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const copyType = button.dataset.copy;
      try {
        if (copyType === 'overall') {
          await copyText(response.overallSummary);
        }
        if (copyType === 'repo') {
          const index = Number(button.dataset.repoIndex ?? '-1');
          if (index >= 0 && response.repositories[index]) {
            await copyText(response.repositories[index].summary);
          }
        }
        ui.statusNode.textContent = 'Summary copied to clipboard.';
      } catch {
        ui.statusNode.textContent = 'Copy failed. Clipboard permissions may be blocked.';
      }
    });
  });
}

function validateDateInputs(): string | undefined {
  const todayTs = new Date(new Date().toISOString().slice(0, 10)).getTime();

  if (state.dateFilterMode === 'specific' && !state.specificDate) {
    return 'Please provide a specific date.';
  }

  if (state.dateFilterMode === 'specific') {
    const specificTs = new Date(state.specificDate).getTime();
    if (specificTs > todayTs) {
      return 'Specific date cannot be in the future.';
    }
  }

  if (state.dateFilterMode === 'range') {
    if (!state.rangeStart || !state.rangeEnd) {
      return 'Please provide both start and end dates for date range.';
    }
    const startTs = new Date(state.rangeStart).getTime();
    const endTs = new Date(state.rangeEnd).getTime();
    if (startTs > todayTs || endTs > todayTs) {
      return 'Date range cannot include future dates.';
    }
    if (startTs > endTs) {
      return 'Date range is invalid. Start date must be before end date.';
    }
  }

  return undefined;
}

async function submitSearch(event: SubmitEvent): Promise<void> {
  event.preventDefault();
  updateStateAndPersist();

  if (!state.authorQuery) {
    ui.statusNode.textContent = 'Please enter a username or author.';
    ui.outputNode.innerHTML = '';
    ui.warningsNode.hidden = true;
    return;
  }

  const dateValidationError = validateDateInputs();
  if (dateValidationError) {
    ui.statusNode.textContent = dateValidationError;
    ui.outputNode.innerHTML = '';
    ui.warningsNode.hidden = true;
    return;
  }

  const token = ui.tokenInput.value.trim();

  const payload: ActivityRequest = {
    repository: state.repository || '',
    authorQuery: state.authorQuery,
    summaryStyle: state.summaryStyle,
    dateFilter: buildDateFilter(),
    token: token || undefined,
  };

  ui.statusNode.textContent = 'Fetching repository activity...';
  renderInfoCard('Loading activity', 'Please wait while we fetch commit activity for your filters.');
  ui.warningsNode.hidden = true;

  try {
    const response = await fetch(`${API_BASE_URL}/api/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed.' }));
      throw new Error(err.error ?? 'Request failed.');
    }

    const data = (await response.json()) as ActivityResponse;
    renderWarnings(data.warnings);
    renderResult(data);

    if (data.totalCommitCount > 0) {
      ui.statusNode.textContent = `Found ${data.totalCommitCount} commit(s).`;
    } else {
      ui.statusNode.textContent = 'Search finished with no matching commits.';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed.';
    ui.statusNode.textContent = message;
    renderInfoCard('Unable to load results', message, 'error');
  }
}

ui.form.addEventListener('submit', (event) => {
  void submitSearch(event);
});

[
  ui.repositoryInput,
  ui.authorInput,
  ui.summaryStyleSelect,
  ui.dateFilterModeSelect,
  ui.specificDateInput,
  ui.rangeStartInput,
  ui.rangeEndInput,
].forEach((node) => {
  node.addEventListener('change', updateStateAndPersist);
  node.addEventListener('input', updateStateAndPersist);
});

syncFormFromState();
applyDateConstraints();
ui.statusNode.textContent = 'Ready. Repository and token are optional based on your access scope.';
renderInfoCard('Ready to fetch', 'Enter filters and click "Fetch Activity" to see commit results.');
