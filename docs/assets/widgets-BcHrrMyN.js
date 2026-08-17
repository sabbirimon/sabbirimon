const S="https://api.github.com",m="sabbirimon",w="sabbirimon-widgets-v1";function y(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function g(){try{const e=sessionStorage.getItem(w);if(!e)return{};const{ts:a,data:t}=JSON.parse(e);return Date.now()-a<6e5?t:{}}catch{return{}}}function h(e){try{const t={...g(),...e};sessionStorage.setItem(w,JSON.stringify({ts:Date.now(),data:t}))}catch{}}async function q(){const e=g();if(e.repos)return e.repos;const a=await fetch(`${S}/users/${m}/repos?per_page=100&sort=updated`,{headers:{Accept:"application/vnd.github+json"}});if(!a.ok)throw new Error(`GitHub ${a.status}`);const t=await a.json();return h({repos:t}),t}const M={JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Kotlin:"#A97BFF",Java:"#b07219",Go:"#00ADD8",Rust:"#dea584",HTML:"#e34c26",CSS:"#563d7c",C:"#555555","C++":"#f34b7d",Jupyter:"#DA5B0B",Shell:"#89e051",Dockerfile:"#384d54",Vue:"#41b883",Svelte:"#ff3e00",Ruby:"#701516",PHP:"#4F5D95",Swift:"#F05138",Dart:"#00B4AB",Lua:"#000080",SCSS:"#c6538c","Objective-C":"#438eff",R:"#198CE7",Perl:"#0298c3"};async function C(e){if(e){e.classList.add("loading");try{const a=await q(),t=new Map;for(const s of a)s.language&&t.set(s.language,(t.get(s.language)||0)+1);const n=[...t.values()].reduce((s,i)=>s+i,0)||1,c=[...t.entries()].sort((s,i)=>i[1]-s[1]).slice(0,8);if(!c.length){e.innerHTML='<p class="widget-empty">No language data on public repos yet.</p>';return}e.innerHTML=`<ul class="lang-list" aria-label="Top languages by repo count">${c.map(([s,i])=>{const l=Math.round(i/n*100),o=M[s]||"#a855f7";return`<li class="lang-row">
        <span class="lang-name"><i style="background:${o}"></i>${y(s)}</span>
        <span class="lang-bar"><span style="width:${l}%;background:${o}"></span></span>
        <span class="lang-pct">${l}%</span>
        <span class="lang-count">${i} ${i===1?"repo":"repos"}</span>
      </li>`}).join("")}</ul>`,e.classList.remove("loading")}catch(a){console.warn("topLanguages failed:",a),e.classList.remove("loading"),e.innerHTML='<p class="widget-empty">Language stats paused — try again in a few minutes.</p>'}}}const b=["radical","onestar","tokyonight","dracula"];async function j(e){if(!e)return;e.classList.add("loading");let t=g().trophyTheme;t||(t=b[Math.floor(Math.random()*b.length)],h({trophyTheme:t}));const n=`https://github-profile-trophy.vercel.app/?username=${m}&theme=${t}&no-frame=true&no-bg=true&margin-w=4`;e.innerHTML=`
    <div class="trophy-wrap">
      <img class="trophy-img" loading="lazy" decoding="async"
           alt="GitHub trophies for ${m}"
           src="${n}"
           onerror="this.parentElement.classList.add('trophy-failed')">
    </div>`,e.querySelector(".trophy-img")?.addEventListener("load",()=>{e.classList.remove("loading"),e.classList.add("loaded")},{once:!0}),setTimeout(()=>{e.classList.contains("loading")&&(e.classList.remove("loading"),e.classList.add(e.querySelector(".trophy-failed")?"error":"loaded"))},4e3)}async function E(e){if(e){e.classList.add("loading");try{let t=g().quote;t||(t=await v(),t&&h({quote:t})),t?f(e,t):p(e),e.querySelector(".quote-refresh")?.addEventListener("click",async()=>{e.classList.add("loading");try{const n=await v();n?(h({quote:n}),f(e,n)):t?f(e,t):p(e)}catch{t?f(e,t):p(e)}finally{e.classList.remove("loading")}}),e.classList.remove("loading"),e.classList.add("loaded")}catch(a){console.warn("quote failed:",a),e.classList.remove("loading"),e.classList.add("error"),p(e)}}}async function v(){try{const e=await fetch("https://zenquotes.io/api/random");if(!e.ok)return null;const a=await e.json();if(Array.isArray(a)&&a[0]?.q)return{content:a[0].q,author:a[0].a||"Unknown"}}catch{}try{const e=await fetch("https://api.adviceslip.com/advice");if(!e.ok)return null;const a=await e.json();if(a?.slip?.advice)return{content:a.slip.advice,author:"Advice Slip"}}catch{}return null}function p(e){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>Programs must be written for people to read, and only incidentally for machines to execute.</p>
    <cite>— Harold Abelson</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}function f(e,a){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>${y(a.content)}</p>
    <cite>— ${y(a.author)}</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}async function F(e,a){if(!e)return;e.classList.add("loading");const t=a||A();if(!t){e.classList.remove("loading"),e.classList.add("error"),e.innerHTML='<p class="widget-empty">Snake paused — heatmap not loaded yet.</p>';return}const n=t.length,c=t[0]?.length||7,s=[];for(let d=0;d<n;d++)for(let r=0;r<c;r++)s.push({c:d,r,level:t[d][r]});const i=H(t),l=i.length,o=70,u=l*o/1e3,$=18;e.innerHTML=`<div class="snake-wrap" role="img" aria-label="Contribution snake animation across ${n} weeks of activity">
    <div class="snake-grid">${s.map(({c:d,r,level:k})=>`<span class="snake-cell" style="--c:${d};--r:${r};--lvl:${k}"></span>`).join("")}</div>
    <svg class="snake-svg" viewBox="0 0 ${n} ${c}" preserveAspectRatio="none">
      <path class="snake-trail" d="${T(i)}" fill="none"
            stroke="rgba(34,211,238,0.25)" stroke-width="0.18"/>
      <circle class="snake-head" r="0.36" fill="#22d3ee">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${u}s" repeatCount="indefinite"/>
        <animateMotion dur="${u}s" repeatCount="indefinite" path="${L(i)}"/>
      </circle>
      ${Array.from({length:$},(d,r)=>`
        <circle class="snake-body snake-body-${r}" r="${.3-r*.012}" fill="#22d3ee" fill-opacity="${.95-r*.04}">
          <animateMotion dur="${u}s" repeatCount="indefinite"
                         path="${L(i)}"
                         begin="-${r*o/1e3}s"/>
        </circle>`).join("")}
    </svg>
  </div>`,e.classList.remove("loading"),e.classList.add("loaded")}function T(e){return e.length?"M "+e.map(([a,t])=>`${a.toFixed(2)} ${t.toFixed(2)}`).join(" L "):""}function L(e){return e.length?"M "+e.map(([a,t])=>`${a.toFixed(2)},${t.toFixed(2)}`).join(" L "):""}function A(){const e=[...document.querySelectorAll(".heat-cell:not(.empty)")];if(e.length<7)return null;const a=[];for(let t=0;t<e.length;t+=7){const n=[];for(let c=0;c<7&&t+c<e.length;c++){const i=e[t+c].className.match(/level-(\d)/);n.push(i?parseInt(i[1],10):0)}a.push(n)}return a}function H(e){const a=e.length;if(!a)return[];const t=[];for(let n=a-1;n>=0;n--){const c=e[n];let s=0,i=-1;for(let l=0;l<c.length;l++)c[l]>i&&(i=c[l],s=l);if(t.push([n+.5,s+.5]),n>0&&Math.random()<.3){const l=e[n-1],o=[s-1,s+1].filter(u=>u>=0&&u<l.length);if(o.length){const u=o[Math.floor(Math.random()*o.length)];t.push([n+.5,u+.5]),t.push([n-.5,u+.5])}}}return t}export{E as initQuote,F as initSnake,C as initTopLanguages,j as initTrophies};
