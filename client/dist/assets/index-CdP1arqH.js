(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const i of document.querySelectorAll('link[rel="modulepreload"]'))s(i);new MutationObserver(i=>{for(const n of i)if(n.type==="childList")for(const l of n.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&s(l)}).observe(document,{childList:!0,subtree:!0});function r(i){const n={};return i.integrity&&(n.integrity=i.integrity),i.referrerPolicy&&(n.referrerPolicy=i.referrerPolicy),i.crossOrigin==="use-credentials"?n.credentials="include":i.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function s(i){if(i.ep)return;i.ep=!0;const n=r(i);fetch(i.href,n)}})();function j(e){return e.slice(0,8)}function H(e){const a=new Date(e);return Number.isNaN(a.getTime())?e:a.toLocaleString()}function d(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}const L="devtrace.preferences.v2";function _(){try{const e=localStorage.getItem(L);return e?JSON.parse(e):{}}catch{return{}}}function Q(e){const a={repository:e.repository,authorQuery:e.authorQuery,summaryStyle:e.summaryStyle,dateFilterMode:e.dateFilterMode,specificDate:e.specificDate,rangeStart:e.rangeStart,rangeEnd:e.rangeEnd};localStorage.setItem(L,JSON.stringify(a))}function B(e){return e==="short"?"Short":e==="professional"?"Professional":e==="detailed"?"Detailed":"Standup-style"}function V(e){return e==="specific"?"Specific date":"Date range"}const U={hueShift:0,noiseIntensity:0,scanlineIntensity:0,speed:.5,scanlineFrequency:0,warpAmount:0};function D(e){return Math.max(0,Math.min(1,e))}function z(e,a,r){const s=(e%360+360)%360,i=D(a),n=D(r),l=(1-Math.abs(2*n-1))*i,c=l*(1-Math.abs(s/60%2-1)),u=n-l/2;let g=0,f=0,y=0;return s<60?(g=l,f=c):s<120?(g=c,f=l):s<180?(f=l,y=c):s<240?(f=c,y=l):s<300?(g=c,y=l):(g=l,y=c),[Math.round((g+u)*255),Math.round((f+u)*255),Math.round((y+u)*255)]}function J(e,a){const r=Math.sin(e*127.1+a*311.7)*43758.5453;return r-Math.floor(r)}function W(e,a={}){const r={...U,...a},s=document.createElement("canvas");s.className="dark-veil-canvas",e.appendChild(s);const i=s.getContext("2d",{alpha:!0});if(!i)return()=>{s.remove()};const n=i;let l=0,c=0,u=0,g=performance.now();function f(){const S=Math.max(1,Math.min(2,window.devicePixelRatio||1));c=window.innerWidth,u=window.innerHeight,s.width=Math.floor(c*S),s.height=Math.floor(u*S),s.style.width=`${c}px`,s.style.height=`${u}px`,n.setTransform(S,0,0,S,0,0)}function y(S){const v=(S-g)/1e3*r.speed,w=220+r.hueShift,M=n.createLinearGradient(0,0,c,u);M.addColorStop(0,`hsl(${w}, 35%, 8%)`),M.addColorStop(.5,`hsl(${w+12}, 32%, 10%)`),M.addColorStop(1,`hsl(${w+24}, 30%, 7%)`),n.clearRect(0,0,c,u),n.fillStyle=M,n.fillRect(0,0,c,u);const N=r.warpAmount;if(N>0){n.globalAlpha=Math.min(.4,N*.5);for(let h=0;h<u;h+=4){const x=Math.sin(h*.015+v*2.5)*N*12;n.drawImage(s,0,h,c,4,x,h,c,4)}n.globalAlpha=1}if(r.scanlineIntensity>0&&r.scanlineFrequency>0){const h=D(r.scanlineIntensity)*.25,x=Math.max(1,r.scanlineFrequency);n.fillStyle=`rgba(255,255,255,${h})`;for(let m=0;m<u;m+=x)n.fillRect(0,m,c,1)}if(r.noiseIntensity>0){const h=D(r.noiseIntensity)*.18,x=n.getImageData(0,0,c,u),m=x.data;for(let I=0;I<u;I+=2)for(let $=0;$<c;$+=2){const b=(I*c+$)*4,C=(J($+v*40,I-v*20)-.5)*255*h;m[b]=Math.max(0,Math.min(255,m[b]+C)),m[b+1]=Math.max(0,Math.min(255,m[b+1]+C)),m[b+2]=Math.max(0,Math.min(255,m[b+2]+C))}n.putImageData(x,0,0)}const P=(w+v*20)%360,[A,R,O]=z(P,.6,.52);n.fillStyle=`rgba(${A}, ${R}, ${O}, 0.08)`,n.beginPath(),n.ellipse(c*.75,u*.25,c*.32,u*.25,v*.07,0,Math.PI*2),n.fill(),l=requestAnimationFrame(y)}return f(),l=requestAnimationFrame(y),window.addEventListener("resize",f),()=>{cancelAnimationFrame(l),window.removeEventListener("resize",f),s.remove()}}const K={},Z=K,G=Z.VITE_API_BASE_URL??"http://localhost:4000",Y={repository:"",authorQuery:"",summaryStyle:"professional",dateFilterMode:"specific",specificDate:"",rangeStart:"",rangeEnd:""},X=_(),o={...Y,...X},ee=document.querySelector("#activityForm"),te=document.querySelector("#repository"),re=document.querySelector("#authorQuery"),ne=document.querySelector("#token"),ae=document.querySelector("#summaryStyle"),oe=document.querySelector("#dateFilterMode"),se=document.querySelector("#specificDate"),ie=document.querySelector("#rangeStart"),ce=document.querySelector("#rangeEnd"),le=document.querySelector('[data-date-block="specific"]'),de=document.querySelector('[data-date-block="range"]'),ue=document.querySelector("#status"),pe=document.querySelector("#warnings"),me=document.querySelector("#output");function p(e,a){if(!e)throw new Error(`Missing required node: ${a}`);return e}const t={form:p(ee,"#activityForm"),repositoryInput:p(te,"#repository"),authorInput:p(re,"#authorQuery"),tokenInput:p(ne,"#token"),summaryStyleSelect:p(ae,"#summaryStyle"),dateFilterModeSelect:p(oe,"#dateFilterMode"),specificDateInput:p(se,"#specificDate"),rangeStartInput:p(ie,"#rangeStart"),rangeEndInput:p(ce,"#rangeEnd"),specificDateSection:p(le,'[data-date-block="specific"]'),rangeDateSection:p(de,'[data-date-block="range"]'),statusNode:p(ue,"#status"),warningsNode:p(pe,"#warnings"),outputNode:p(me,"#output")};function E(e,a,r="neutral"){const s=r==="error"?"border-rose-800 bg-rose-950/40 text-rose-200":"border-[#30363d] bg-[#0f141b] text-slate-300";t.outputNode.innerHTML=`
    <section class="grid min-h-[320px] place-items-center">
      <div class="w-full max-w-xl rounded-2xl border p-8 text-center ${s}">
        <h3 class="m-0 text-xl font-semibold">${d(e)}</h3>
        <p class="mt-2 text-sm">${d(a)}</p>
      </div>
    </section>
  `}function fe(){t.repositoryInput.value=o.repository,t.authorInput.value=o.authorQuery,t.summaryStyleSelect.value=o.summaryStyle,t.dateFilterModeSelect.value=o.dateFilterMode,t.specificDateInput.value=o.specificDate,t.rangeStartInput.value=o.rangeStart,t.rangeEndInput.value=o.rangeEnd,T()}function T(){const e=o.dateFilterMode==="specific";t.specificDateSection.hidden=!e,t.rangeDateSection.hidden=e,t.specificDateInput.required=e,t.rangeStartInput.required=!e,t.rangeEndInput.required=!e}function he(){const e=new Date().toISOString().slice(0,10);t.specificDateInput.max=e,t.rangeStartInput.max=e,t.rangeEndInput.max=e}function F(){o.repository=t.repositoryInput.value.trim(),o.authorQuery=t.authorInput.value.trim(),o.summaryStyle=t.summaryStyleSelect.value,o.dateFilterMode=t.dateFilterModeSelect.value,o.specificDate=t.specificDateInput.value,o.rangeStart=t.rangeStartInput.value,o.rangeEnd=t.rangeEndInput.value,Q(o),T()}function ye(){return o.dateFilterMode==="specific"?{mode:"specific",specificDate:o.specificDate}:{mode:"range",startDate:o.rangeStart,endDate:o.rangeEnd}}function ge(e){if(!e||e.length===0){t.warningsNode.innerHTML="",t.warningsNode.hidden=!0;return}t.warningsNode.hidden=!1,t.warningsNode.innerHTML=`
    <h3 class="m-0 text-sm font-semibold text-amber-300">Warnings</h3>
    <ul class="mt-1 list-disc pl-5 text-sm text-amber-100">
      ${e.map(a=>`<li>${d(a)}</li>`).join("")}
    </ul>
  `}function Se(e){return`Source: ${e.source} | Provider: ${e.provider} | Commits: ${e.commitCount}`}function k(e,a,r){const s=typeof r=="number"?` data-repo-index="${r}"`:"";return`
    <button
      type="button"
      class="btn-secondary h-9 w-9 p-0"
      data-copy="${e}"${s}
      aria-label="${d(a)}"
      title="${d(a)}"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    </button>
  `}function xe(e,a){return`
    <article class="rounded-xl border border-[#30363d] bg-[#0f141b] p-3">
      <header class="flex flex-col items-start justify-between gap-2 md:flex-row">
        <div>
          <h3 class="m-0 text-base font-semibold">${d(e.repoName)}</h3>
          <p class="mt-1 text-xs text-slate-400">${d(Se(e))}</p>
          <p class="mt-1 break-all text-xs text-slate-500">${d(e.repoPathOrUrl)}</p>
        </div>
        ${k("repo","Copy repository summary",a)}
      </header>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Repository Summary</h4>
        <pre class="summary-pre mt-2">${d(e.summary)}</pre>
      </section>
      <section class="mt-3">
        <h4 class="m-0 text-sm font-semibold">Matching Commits</h4>
        <ul class="scroll-thin mt-2 grid max-h-64 gap-2 overflow-auto pr-1">
          ${e.commits.map(r=>{const s=r.files&&r.files.length>0?`<p class="mt-1 text-xs text-slate-500">Files: ${d(r.files.slice(0,12).join(", "))}</p>`:"";return`
                <li class="rounded-lg border border-[#30363d] bg-[#161b22] p-2">
                  <div class="flex items-center justify-between gap-2 text-xs text-slate-300">
                    <strong>${d(j(r.hash))}</strong>
                    <span>${d(H(r.date))}</span>
                  </div>
                  <p class="mt-1 text-sm">${d(r.message)}</p>
                  <p class="mt-1 text-xs text-slate-400">Author: ${d(r.author)}${r.authorEmail?` (${d(r.authorEmail)})`:""}</p>
                  ${s}
                </li>
              `}).join("")}
        </ul>
      </section>
    </article>
  `}function be(e){if(e.totalCommitCount===0||e.repositories.length===0){t.outputNode.innerHTML=`
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
          <p class="mt-1 text-xs text-slate-400">${d(`Repository: ${e.repository||"All available repositories for target"} | Commits: ${e.totalCommitCount} | Style: ${B(o.summaryStyle)} | Date: ${V(o.dateFilterMode)}`)}</p>
        </div>
        ${k("overall","Copy overall summary")}
      </header>
      <pre class="summary-pre mt-2">${d(e.overallSummary)}</pre>
    </section>
    <section class="grid gap-3 ${e.repositories.length===1?"grid-cols-1":"grid-cols-1 2xl:grid-cols-2"}">
      ${e.repositories.map((a,r)=>xe(a,r)).join("")}
    </section>
  `,ve(e)}async function q(e){await navigator.clipboard.writeText(e)}function ve(e){t.outputNode.querySelectorAll("[data-copy]").forEach(r=>{r.addEventListener("click",async()=>{const s=r.dataset.copy;try{if(s==="overall"&&await q(e.overallSummary),s==="repo"){const i=Number(r.dataset.repoIndex??"-1");i>=0&&e.repositories[i]&&await q(e.repositories[i].summary)}t.statusNode.textContent="Summary copied to clipboard."}catch{t.statusNode.textContent="Copy failed. Clipboard permissions may be blocked."}})})}function we(){const e=new Date(new Date().toISOString().slice(0,10)).getTime();if(o.dateFilterMode==="specific"&&!o.specificDate)return"Please provide a specific date.";if(o.dateFilterMode==="specific"&&new Date(o.specificDate).getTime()>e)return"Specific date cannot be in the future.";if(o.dateFilterMode==="range"){if(!o.rangeStart||!o.rangeEnd)return"Please provide both start and end dates for date range.";const a=new Date(o.rangeStart).getTime(),r=new Date(o.rangeEnd).getTime();if(a>e||r>e)return"Date range cannot include future dates.";if(a>r)return"Date range is invalid. Start date must be before end date."}}async function Me(e){if(e.preventDefault(),F(),!o.authorQuery){t.statusNode.textContent="Please enter a username or author.",t.outputNode.innerHTML="",t.warningsNode.hidden=!0;return}const a=we();if(a){t.statusNode.textContent=a,t.outputNode.innerHTML="",t.warningsNode.hidden=!0;return}const r=t.tokenInput.value.trim(),s={repository:o.repository||"",authorQuery:o.authorQuery,summaryStyle:o.summaryStyle,dateFilter:ye(),token:r||void 0};t.statusNode.textContent="Fetching repository activity...",E("Loading activity","Please wait while we fetch commit activity for your filters."),t.warningsNode.hidden=!0;try{const i=await fetch(`${G}/api/activity`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)});if(!i.ok){const l=await i.json().catch(()=>({error:"Request failed."}));throw new Error(l.error??"Request failed.")}const n=await i.json();ge(n.warnings),be(n),n.totalCommitCount>0?t.statusNode.textContent=`Found ${n.totalCommitCount} commit(s).`:t.statusNode.textContent="Search finished with no matching commits."}catch(i){const n=i instanceof Error?i.message:"Search failed.";t.statusNode.textContent=n,E("Unable to load results",n,"error")}}t.form.addEventListener("submit",e=>{Me(e)});[t.repositoryInput,t.authorInput,t.summaryStyleSelect,t.dateFilterModeSelect,t.specificDateInput,t.rangeStartInput,t.rangeEndInput].forEach(e=>{e.addEventListener("change",F),e.addEventListener("input",F)});fe();he();t.statusNode.textContent="Ready. Repository and token are optional based on your access scope.";E("Ready to fetch",'Enter filters and click "Fetch Activity" to see commit results.');W(document.body,{hueShift:0,noiseIntensity:0,scanlineIntensity:0,speed:.5,scanlineFrequency:0,warpAmount:0});document.body.classList.remove("preload");
