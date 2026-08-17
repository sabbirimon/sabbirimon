const v="https://api.github.com",f="sabbirimon",y="sabbirimon-widgets-v1";function m(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function h(){try{const e=sessionStorage.getItem(y);if(!e)return{};const{ts:a,data:t}=JSON.parse(e);return Date.now()-a<6e5?t:{}}catch{return{}}}function p(e){try{const t={...h(),...e};sessionStorage.setItem(y,JSON.stringify({ts:Date.now(),data:t}))}catch{}}async function k(){const e=h();if(e.repos)return e.repos;const a=await fetch(`${v}/users/${f}/repos?per_page=100&sort=updated`,{headers:{Accept:"application/vnd.github+json"}});if(!a.ok)throw new Error(`GitHub ${a.status}`);const t=await a.json();return p({repos:t}),t}const S={JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Kotlin:"#A97BFF",Java:"#b07219",Go:"#00ADD8",Rust:"#dea584",HTML:"#e34c26",CSS:"#563d7c",C:"#555555","C++":"#f34b7d",Jupyter:"#DA5B0B",Shell:"#89e051",Dockerfile:"#384d54",Vue:"#41b883",Svelte:"#ff3e00",Ruby:"#701516",PHP:"#4F5D95",Swift:"#F05138",Dart:"#00B4AB",Lua:"#000080",SCSS:"#c6538c","Objective-C":"#438eff",R:"#198CE7",Perl:"#0298c3"};async function A(e){if(e){e.classList.add("loading");try{const a=await k(),t=new Map;for(const o of a)o.language&&t.set(o.language,(t.get(o.language)||0)+1);const n=[...t.values()].reduce((o,i)=>o+i,0)||1,s=[...t.entries()].sort((o,i)=>i[1]-o[1]).slice(0,8);if(!s.length){e.innerHTML='<p class="widget-empty">No language data on public repos yet.</p>';return}e.innerHTML=`<ul class="lang-list" aria-label="Top languages by repo count">${s.map(([o,i])=>{const c=Math.round(i/n*100),r=S[o]||"#a855f7";return`<li class="lang-row">
        <span class="lang-name"><i style="background:${r}"></i>${m(o)}</span>
        <span class="lang-bar"><span style="width:${c}%;background:${r}"></span></span>
        <span class="lang-pct">${c}%</span>
        <span class="lang-count">${i} ${i===1?"repo":"repos"}</span>
      </li>`}).join("")}</ul>`,e.classList.remove("loading")}catch(a){console.warn("topLanguages failed:",a),e.classList.remove("loading"),e.innerHTML='<p class="widget-empty">Language stats paused — try again in a few minutes.</p>'}}}const b=["radical","onestar","tokyonight","dracula"];async function H(e){if(!e)return;e.classList.add("loading");let t=h().trophyTheme;t||(t=b[Math.floor(Math.random()*b.length)],p({trophyTheme:t}));const n=`https://github-profile-trophy.vercel.app/?username=${f}&theme=${t}&no-frame=true&no-bg=true&margin-w=4`;e.innerHTML=`
    <div class="trophy-wrap">
      <img class="trophy-img" loading="lazy" decoding="async"
           alt="GitHub trophies for ${f}"
           src="${n}"
           onerror="this.parentElement.classList.add('trophy-failed')">
    </div>`,e.querySelector(".trophy-img")?.addEventListener("load",()=>{e.classList.remove("loading"),e.classList.add("loaded")},{once:!0}),setTimeout(()=>{e.classList.contains("loading")&&(e.classList.remove("loading"),e.classList.add(e.querySelector(".trophy-failed")?"error":"loaded"))},4e3)}async function C(e){if(e){e.classList.add("loading");try{let t=h().quote;if(!t){const n=await fetch("https://api.quotable.io/random?tags=technology,wisdom,famous-quotes&maxLength=140");if(!n.ok)throw new Error(`quotable ${n.status}`);const s=await n.json();t={content:s.content,author:s.author},p({quote:t})}g(e,t),e.querySelector(".quote-refresh")?.addEventListener("click",async()=>{e.classList.add("loading");try{sessionStorage.removeItem(y);const n=await fetch("https://api.quotable.io/random?tags=technology,wisdom,famous-quotes&maxLength=140");if(!n.ok)throw new Error(`quotable ${n.status}`);const s=await n.json();p({quote:{content:s.content,author:s.author}}),g(e,{content:s.content,author:s.author})}catch{g(e,t)}finally{e.classList.remove("loading")}}),e.classList.remove("loading"),e.classList.add("loaded")}catch(a){console.warn("quote failed:",a),e.classList.remove("loading"),e.classList.add("error"),e.innerHTML=`<blockquote class="quote-fallback">
      “Programs must be written for people to read, and only incidentally for machines to execute.”
      <cite>— Harold Abelson</cite>
    </blockquote>`}}}function g(e,a){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>${m(a.content)}</p>
    <cite>— ${m(a.author)}</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}async function E(e,a){if(!e)return;e.classList.add("loading");const t=a||M();if(!t){e.classList.remove("loading"),e.classList.add("error"),e.innerHTML='<p class="widget-empty">Snake paused — heatmap not loaded yet.</p>';return}const n=t.length,s=t[0]?.length||7,o=[];for(let d=0;d<n;d++)for(let l=0;l<s;l++)o.push({c:d,r:l,level:t[d][l]});const i=T(t),c=i.length,r=70,u=c*r/1e3,w=18;e.innerHTML=`<div class="snake-wrap" role="img" aria-label="Contribution snake animation across ${n} weeks of activity">
    <div class="snake-grid">${o.map(({c:d,r:l,level:$})=>`<span class="snake-cell" style="--c:${d};--r:${l};--lvl:${$}"></span>`).join("")}</div>
    <svg class="snake-svg" viewBox="0 0 ${n} ${s}" preserveAspectRatio="none">
      <path class="snake-trail" d="${q(i)}" fill="none"
            stroke="rgba(34,211,238,0.25)" stroke-width="0.18"/>
      <circle class="snake-head" r="0.36" fill="#22d3ee">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${u}s" repeatCount="indefinite"/>
        <animateMotion dur="${u}s" repeatCount="indefinite" path="${L(i)}"/>
      </circle>
      ${Array.from({length:w},(d,l)=>`
        <circle class="snake-body snake-body-${l}" r="${.3-l*.012}" fill="#22d3ee" fill-opacity="${.95-l*.04}">
          <animateMotion dur="${u}s" repeatCount="indefinite"
                         path="${L(i)}"
                         begin="-${l*r/1e3}s"/>
        </circle>`).join("")}
    </svg>
  </div>`,e.classList.remove("loading"),e.classList.add("loaded")}function q(e){return e.length?"M "+e.map(([a,t])=>`${a.toFixed(2)} ${t.toFixed(2)}`).join(" L "):""}function L(e){return e.length?"M "+e.map(([a,t])=>`${a.toFixed(2)},${t.toFixed(2)}`).join(" L "):""}function M(){const e=[...document.querySelectorAll(".heat-cell:not(.empty)")];if(e.length<7)return null;const a=[];for(let t=0;t<e.length;t+=7){const n=[];for(let s=0;s<7&&t+s<e.length;s++){const i=e[t+s].className.match(/level-(\d)/);n.push(i?parseInt(i[1],10):0)}a.push(n)}return a}function T(e){const a=e.length;if(!a)return[];const t=[];for(let n=a-1;n>=0;n--){const s=e[n];let o=0,i=-1;for(let c=0;c<s.length;c++)s[c]>i&&(i=s[c],o=c);if(t.push([n+.5,o+.5]),n>0&&Math.random()<.3){const c=e[n-1],r=[o-1,o+1].filter(u=>u>=0&&u<c.length);if(r.length){const u=r[Math.floor(Math.random()*r.length)];t.push([n+.5,u+.5]),t.push([n-.5,u+.5])}}}return t}export{C as initQuote,E as initSnake,A as initTopLanguages,H as initTrophies};
