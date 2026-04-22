(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))u(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const d of s.addedNodes)d.tagName==="LINK"&&d.rel==="modulepreload"&&u(d)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function u(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();function g(e){return e.slice(0,8)}function h(e){const o=new Date(e);return Number.isNaN(o.getTime())?e:o.toLocaleString()}function i(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const f="devtrace.preferences.v2";function S(){try{const e=localStorage.getItem(f);return e?JSON.parse(e):{}}catch{return{}}}function b(e){const o={repository:e.repository,authorQuery:e.authorQuery,summaryStyle:e.summaryStyle,dateFilterMode:e.dateFilterMode,specificDate:e.specificDate,rangeStart:e.rangeStart,rangeEnd:e.rangeEnd};localStorage.setItem(f,JSON.stringify(o))}function x(e){return e==="short"?"Short":e==="professional"?"Professional":e==="detailed"?"Detailed":"Standup-style"}function v(e){return e==="specific"?"Specific date":"Date range"}const w={},I=w,D=I.VITE_API_BASE_URL??"http://localhost:4000",N={repository:"",authorQuery:"",summaryStyle:"professional",dateFilterMode:"specific",specificDate:"",rangeStart:"",rangeEnd:""},M=S(),r={...N,...M},E=document.querySelector("#activityForm"),$=document.querySelector("#repository"),C=document.querySelector("#authorQuery"),F=document.querySelector("#token"),T=document.querySelector("#summaryStyle"),q=document.querySelector("#dateFilterMode"),L=document.querySelector("#specificDate"),P=document.querySelector("#rangeStart"),k=document.querySelector("#rangeEnd"),O=document.querySelector('[data-date-block="specific"]'),j=document.querySelector('[data-date-block="range"]'),R=document.querySelector("#status"),_=document.querySelector("#warnings"),A=document.querySelector("#output");function c(e,o){if(!e)throw new Error(`Missing required node: ${o}`);return e}const t={form:c(E,"#activityForm"),repositoryInput:c($,"#repository"),authorInput:c(C,"#authorQuery"),tokenInput:c(F,"#token"),summaryStyleSelect:c(T,"#summaryStyle"),dateFilterModeSelect:c(q,"#dateFilterMode"),specificDateInput:c(L,"#specificDate"),rangeStartInput:c(P,"#rangeStart"),rangeEndInput:c(k,"#rangeEnd"),specificDateSection:c(O,'[data-date-block="specific"]'),rangeDateSection:c(j,'[data-date-block="range"]'),statusNode:c(R,"#status"),warningsNode:c(_,"#warnings"),outputNode:c(A,"#output")};function l(e,o,n="neutral"){const u=n==="error"?"border-rose-800 bg-rose-950/40 text-rose-200":"border-[#30363d] bg-[#0f141b] text-slate-300";t.outputNode.innerHTML=`
    <section class="grid min-h-[320px] place-items-center">
      <div class="w-full max-w-xl rounded-2xl border p-8 text-center ${u}">
        <h3 class="m-0 text-xl font-semibold">${i(e)}</h3>
        <p class="mt-2 text-sm">${i(o)}</p>
      </div>
    </section>
  `}function H(){t.repositoryInput.value=r.repository,t.authorInput.value=r.authorQuery,t.summaryStyleSelect.value=r.summaryStyle,t.dateFilterModeSelect.value=r.dateFilterMode,t.specificDateInput.value=r.specificDate,t.rangeStartInput.value=r.rangeStart,t.rangeEndInput.value=r.rangeEnd,y()}function y(){const e=r.dateFilterMode==="specific";t.specificDateSection.hidden=!e,t.rangeDateSection.hidden=e,t.specificDateInput.required=e,t.rangeStartInput.required=!e,t.rangeEndInput.required=!e}function Q(){const e=new Date().toISOString().slice(0,10);t.specificDateInput.max=e,t.rangeStartInput.max=e,t.rangeEndInput.max=e}function p(){r.repository=t.repositoryInput.value.trim(),r.authorQuery=t.authorInput.value.trim(),r.summaryStyle=t.summaryStyleSelect.value,r.dateFilterMode=t.dateFilterModeSelect.value,r.specificDate=t.specificDateInput.value,r.rangeStart=t.rangeStartInput.value,r.rangeEnd=t.rangeEndInput.value,b(r),y()}function B(){return r.dateFilterMode==="specific"?{mode:"specific",specificDate:r.specificDate}:{mode:"range",startDate:r.rangeStart,endDate:r.rangeEnd}}function U(e){if(!e||e.length===0){t.warningsNode.innerHTML="",t.warningsNode.hidden=!0;return}t.warningsNode.hidden=!1,t.warningsNode.innerHTML=`
    <h3 class="m-0 text-sm font-semibold text-amber-300">Warnings</h3>
    <ul class="mt-1 list-disc pl-5 text-sm text-amber-100">
      ${e.map(o=>`<li>${i(o)}</li>`).join("")}
    </ul>
  `}function J(e){return`Source: ${e.source} | Provider: ${e.provider} | Commits: ${e.commitCount}`}function V(e,o){return`
    <article class="rounded-xl border border-[#30363d] bg-[#0f141b] p-3">
      <header class="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h3 class="m-0 text-base font-semibold">${i(e.repoName)}</h3>
          <p class="mt-1 text-xs text-slate-400">${i(J(e))}</p>
          <p class="mt-1 break-all text-xs text-slate-500">${i(e.repoPathOrUrl)}</p>
        </div>
        <button type="button" class="btn-secondary" data-copy="repo" data-repo-index="${o}">Copy Repo Summary</button>
      </header>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Repository Summary</h4>
        <pre class="summary-pre mt-2">${i(e.summary)}</pre>
      </section>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Matching Commits</h4>
        <ul class="scroll-thin mt-2 grid max-h-64 gap-2 overflow-auto pr-1">
          ${e.commits.map(n=>{const u=n.files&&n.files.length>0?`<p class="mt-1 text-xs text-slate-500">Files: ${i(n.files.slice(0,12).join(", "))}</p>`:"";return`
                <li class="rounded-lg border border-[#30363d] bg-[#161b22] p-2">
                  <div class="flex items-center justify-between gap-2 text-xs text-slate-300">
                    <strong>${i(g(n.hash))}</strong>
                    <span>${i(h(n.date))}</span>
                  </div>
                  <p class="mt-1 text-sm">${i(n.message)}</p>
                  <p class="mt-1 text-xs text-slate-400">Author: ${i(n.author)}${n.authorEmail?` (${i(n.authorEmail)})`:""}</p>
                  ${u}
                </li>
              `}).join("")}
        </ul>
      </section>
    </article>
  `}function K(e){if(e.totalCommitCount===0||e.repositories.length===0){t.outputNode.innerHTML=`
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
    `;return}t.outputNode.innerHTML=`
    <section class="rounded-xl border border-[#30363d] bg-[#0f141b] p-3">
      <header class="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h3 class="m-0 text-base font-semibold">Overall Summary</h3>
          <p class="mt-1 text-xs text-slate-400">${i(`Repository: ${e.repository||"All available repositories for target"} | Commits: ${e.totalCommitCount} | Style: ${x(r.summaryStyle)} | Date: ${v(r.dateFilterMode)}`)}</p>
        </div>
        <button type="button" class="btn-primary" data-copy="overall">Copy Overall Summary</button>
      </header>
      <pre class="summary-pre mt-2">${i(e.overallSummary)}</pre>
    </section>
    <section class="grid gap-3 ${e.repositories.length===1?"grid-cols-1":"grid-cols-1 2xl:grid-cols-2"}">
      ${e.repositories.map((o,n)=>V(o,n)).join("")}
    </section>
  `,W(e)}async function m(e){await navigator.clipboard.writeText(e)}function W(e){t.outputNode.querySelectorAll("[data-copy]").forEach(n=>{n.addEventListener("click",async()=>{const u=n.dataset.copy;try{if(u==="overall"&&await m(e.overallSummary),u==="repo"){const a=Number(n.dataset.repoIndex??"-1");a>=0&&e.repositories[a]&&await m(e.repositories[a].summary)}t.statusNode.textContent="Summary copied to clipboard."}catch{t.statusNode.textContent="Copy failed. Clipboard permissions may be blocked."}})})}function Z(){const e=new Date(new Date().toISOString().slice(0,10)).getTime();if(r.dateFilterMode==="specific"&&!r.specificDate)return"Please provide a specific date.";if(r.dateFilterMode==="specific"&&new Date(r.specificDate).getTime()>e)return"Specific date cannot be in the future.";if(r.dateFilterMode==="range"){if(!r.rangeStart||!r.rangeEnd)return"Please provide both start and end dates for date range.";const o=new Date(r.rangeStart).getTime(),n=new Date(r.rangeEnd).getTime();if(o>e||n>e)return"Date range cannot include future dates.";if(o>n)return"Date range is invalid. Start date must be before end date."}}async function Y(e){if(e.preventDefault(),p(),!r.authorQuery){t.statusNode.textContent="Please enter a username or author.",t.outputNode.innerHTML="",t.warningsNode.hidden=!0;return}const o=Z();if(o){t.statusNode.textContent=o,t.outputNode.innerHTML="",t.warningsNode.hidden=!0;return}const n=t.tokenInput.value.trim(),u={repository:r.repository||"",authorQuery:r.authorQuery,summaryStyle:r.summaryStyle,dateFilter:B(),token:n||void 0};t.statusNode.textContent="Fetching repository activity...",l("Loading activity","Please wait while we fetch commit activity for your filters."),t.warningsNode.hidden=!0;try{const a=await fetch(`${D}/api/activity`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(u)});if(!a.ok){const d=await a.json().catch(()=>({error:"Request failed."}));throw new Error(d.error??"Request failed.")}const s=await a.json();U(s.warnings),K(s),s.totalCommitCount>0?t.statusNode.textContent=`Found ${s.totalCommitCount} commit(s).`:t.statusNode.textContent="Search finished with no matching commits."}catch(a){const s=a instanceof Error?a.message:"Search failed.";t.statusNode.textContent=s,l("Unable to load results",s,"error")}}t.form.addEventListener("submit",e=>{Y(e)});[t.repositoryInput,t.authorInput,t.summaryStyleSelect,t.dateFilterModeSelect,t.specificDateInput,t.rangeStartInput,t.rangeEndInput].forEach(e=>{e.addEventListener("change",p),e.addEventListener("input",p)});H();Q();t.statusNode.textContent="Ready. Repository and token are optional based on your access scope.";l("Ready to fetch",'Enter filters and click "Fetch Activity" to see commit results.');document.body.classList.remove("preload");
