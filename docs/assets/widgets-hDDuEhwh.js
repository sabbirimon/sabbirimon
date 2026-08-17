const S="https://api.github.com",y="sabbirimon",$="sabbirimon-widgets-v1";function b(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function m(){try{const e=sessionStorage.getItem($);if(!e)return{};const{ts:n,data:t}=JSON.parse(e);return Date.now()-n<6e5?t:{}}catch{return{}}}function g(e){try{const t={...m(),...e};sessionStorage.setItem($,JSON.stringify({ts:Date.now(),data:t}))}catch{}}async function T(){const e=m();if(e.repos)return e.repos;const n=await fetch(`${S}/users/${y}/repos?per_page=100&sort=updated`,{headers:{Accept:"application/vnd.github+json"}});if(!n.ok)throw new Error(`GitHub ${n.status}`);const t=await n.json();return g({repos:t}),t}const q={JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Kotlin:"#A97BFF",Java:"#b07219",Go:"#00ADD8",Rust:"#dea584",HTML:"#e34c26",CSS:"#563d7c",C:"#555555","C++":"#f34b7d",Jupyter:"#DA5B0B",Shell:"#89e051",Dockerfile:"#384d54",Vue:"#41b883",Svelte:"#ff3e00",Ruby:"#701516",PHP:"#4F5D95",Swift:"#F05138",Dart:"#00B4AB",Lua:"#000080",SCSS:"#c6538c","Objective-C":"#438eff",R:"#198CE7",Perl:"#0298c3"};async function C(e){if(e){e.classList.add("loading");try{const n=await T(),t=new Map;for(const l of n)l.language&&t.set(l.language,(t.get(l.language)||0)+1);const i=[...t.values()].reduce((l,s)=>l+s,0)||1,a=[...t.entries()].sort((l,s)=>s[1]-l[1]).slice(0,8);if(!a.length){e.innerHTML='<p class="widget-empty">No language data on public repos yet.</p>';return}e.innerHTML=`<ul class="lang-list" aria-label="Top languages by repo count">${a.map(([l,s])=>{const u=Math.round(s/i*100),r=q[l]||"#a855f7";return`<li class="lang-row">
        <span class="lang-name"><i style="background:${r}"></i>${b(l)}</span>
        <span class="lang-bar"><span style="width:${u}%;background:${r}"></span></span>
        <span class="lang-pct">${u}%</span>
        <span class="lang-count">${s} ${s===1?"repo":"repos"}</span>
      </li>`}).join("")}</ul>`,e.classList.remove("loading")}catch(n){console.warn("topLanguages failed:",n),e.classList.remove("loading"),e.innerHTML='<p class="widget-empty">Language stats paused — try again in a few minutes.</p>'}}}const v=["radical","onestar","tokyonight","dracula"];async function E(e){if(!e)return;e.classList.add("loading");let t=m().trophyTheme;t||(t=v[Math.floor(Math.random()*v.length)],g({trophyTheme:t}));const i=`https://github-profile-trophy.vercel.app/?username=${y}&theme=${t}&no-frame=true&no-bg=true&margin-w=4`;e.innerHTML=`
    <div class="trophy-wrap">
      <img class="trophy-img" loading="lazy" decoding="async"
           alt="GitHub trophies for ${y}"
           src="${i}"
           onerror="this.parentElement.classList.add('trophy-failed')">
    </div>`,e.querySelector(".trophy-img")?.addEventListener("load",()=>{e.classList.remove("loading"),e.classList.add("loaded")},{once:!0}),setTimeout(()=>{e.classList.contains("loading")&&(e.classList.remove("loading"),e.classList.add(e.querySelector(".trophy-failed")?"error":"loaded"))},4e3)}async function F(e){if(e){e.classList.add("loading");try{let t=m().quote;t||(t=await L(),t&&g({quote:t})),t?f(e,t):h(e),e.querySelector(".quote-refresh")?.addEventListener("click",async()=>{e.classList.add("loading");try{const i=await L();i?(g({quote:i}),f(e,i)):t?f(e,t):h(e)}catch{t?f(e,t):h(e)}finally{e.classList.remove("loading")}}),e.classList.remove("loading"),e.classList.add("loaded")}catch(n){console.warn("quote failed:",n),e.classList.remove("loading"),e.classList.add("error"),h(e)}}}async function L(){const e=(a,l)=>Promise.race([a,new Promise((s,u)=>setTimeout(()=>u(new Error("timeout")),l))]),n=e(fetch("https://api.adviceslip.com/advice").then(a=>a.ok?a.json():null),4e3).then(a=>a?.slip?.advice?{content:a.slip.advice,author:"Advice Slip"}:null).catch(()=>null),t=e(fetch("https://zenquotes.io/api/random").then(a=>a.ok?a.json():null),4e3).then(a=>Array.isArray(a)&&a[0]?.q?{content:a[0].q,author:a[0].a||"Unknown"}:null).catch(()=>null);return await Promise.any([n,t])||null}function h(e){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>Programs must be written for people to read, and only incidentally for machines to execute.</p>
    <cite>— Harold Abelson</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}function f(e,n){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>${b(n.content)}</p>
    <cite>— ${b(n.author)}</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}async function P(e,n){if(!e)return;e.classList.add("loading");let t=n;if(!t)for(let o=0;o<20&&(t=M(),!t);o++)await new Promise(c=>setTimeout(c,500));if(!t){e.classList.remove("loading"),e.classList.add("error"),e.innerHTML='<p class="widget-empty">Snake paused — heatmap not loaded yet.</p>';return}const i=t.length,a=t[0]?.length||7,l=[];for(let o=0;o<i;o++)for(let c=0;c<a;c++)l.push({c:o,r:c,level:t[o][c]});const s=H(t),u=s.length,r=70,d=u*r/1e3,p=18;e.innerHTML=`<div class="snake-wrap" role="img" aria-label="Contribution snake animation across ${i} weeks of activity">
    <div class="snake-grid">${l.map(({c:o,r:c,level:k})=>`<span class="snake-cell" style="--c:${o};--r:${c};--lvl:${k}"></span>`).join("")}</div>
    <svg class="snake-svg" viewBox="0 0 ${i} ${a}" preserveAspectRatio="none">
      <path class="snake-trail" d="${A(s)}" fill="none"
            stroke="rgba(34,211,238,0.25)" stroke-width="0.18"/>
      <circle class="snake-head" r="0.36" fill="#22d3ee">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${d}s" repeatCount="indefinite"/>
        <animateMotion dur="${d}s" repeatCount="indefinite" path="${w(s)}"/>
      </circle>
      ${Array.from({length:p},(o,c)=>`
        <circle class="snake-body snake-body-${c}" r="${.3-c*.012}" fill="#22d3ee" fill-opacity="${.95-c*.04}">
          <animateMotion dur="${d}s" repeatCount="indefinite"
                         path="${w(s)}"
                         begin="-${c*r/1e3}s"/>
        </circle>`).join("")}
    </svg>
  </div>`,e.classList.remove("loading"),e.classList.add("loaded")}function A(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)} ${t.toFixed(2)}`).join(" L "):""}function w(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)},${t.toFixed(2)}`).join(" L "):""}function M(){const e=[...document.querySelectorAll(".heat-cell:not(.empty)")];if(e.length<7)return null;const n=[];for(let t=0;t<e.length;t+=7){const i=[];for(let a=0;a<7&&t+a<e.length;a++){const s=e[t+a].className.match(/level-(\d)/);i.push(s?parseInt(s[1],10):0)}n.push(i)}return n}function H(e){const n=e.length;if(!n)return[];const t=[];let i=0;for(let a=n-1;a>=0;a--){const l=e[a];let s=i,u=-1;for(let r=0;r<l.length;r++){const d=Math.abs(r-i),p=l[r]*10-d*.5;p>u&&(u=p,s=r)}t.push([a+.5,s+.5]),i=s}return t}export{F as initQuote,P as initSnake,C as initTopLanguages,E as initTrophies};
