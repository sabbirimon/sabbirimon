const S="https://api.github.com",m="sabbirimon",w="sabbirimon-widgets-v1";function y(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function g(){try{const e=sessionStorage.getItem(w);if(!e)return{};const{ts:n,data:t}=JSON.parse(e);return Date.now()-n<6e5?t:{}}catch{return{}}}function f(e){try{const t={...g(),...e};sessionStorage.setItem(w,JSON.stringify({ts:Date.now(),data:t}))}catch{}}async function T(){const e=g();if(e.repos)return e.repos;const n=await fetch(`${S}/users/${m}/repos?per_page=100&sort=updated`,{headers:{Accept:"application/vnd.github+json"}});if(!n.ok)throw new Error(`GitHub ${n.status}`);const t=await n.json();return f({repos:t}),t}const q={JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Kotlin:"#A97BFF",Java:"#b07219",Go:"#00ADD8",Rust:"#dea584",HTML:"#e34c26",CSS:"#563d7c",C:"#555555","C++":"#f34b7d",Jupyter:"#DA5B0B",Shell:"#89e051",Dockerfile:"#384d54",Vue:"#41b883",Svelte:"#ff3e00",Ruby:"#701516",PHP:"#4F5D95",Swift:"#F05138",Dart:"#00B4AB",Lua:"#000080",SCSS:"#c6538c","Objective-C":"#438eff",R:"#198CE7",Perl:"#0298c3"};async function C(e){if(e){e.classList.add("loading");try{const n=await T(),t=new Map;for(const i of n)i.language&&t.set(i.language,(t.get(i.language)||0)+1);const s=[...t.values()].reduce((i,l)=>i+l,0)||1,a=[...t.entries()].sort((i,l)=>l[1]-i[1]).slice(0,8);if(!a.length){e.innerHTML='<p class="widget-empty">No language data on public repos yet.</p>';return}e.innerHTML=`<ul class="lang-list" aria-label="Top languages by repo count">${a.map(([i,l])=>{const c=Math.round(l/s*100),o=q[i]||"#a855f7";return`<li class="lang-row">
        <span class="lang-name"><i style="background:${o}"></i>${y(i)}</span>
        <span class="lang-bar"><span style="width:${c}%;background:${o}"></span></span>
        <span class="lang-pct">${c}%</span>
        <span class="lang-count">${l} ${l===1?"repo":"repos"}</span>
      </li>`}).join("")}</ul>`,e.classList.remove("loading")}catch(n){console.warn("topLanguages failed:",n),e.classList.remove("loading"),e.innerHTML='<p class="widget-empty">Language stats paused — try again in a few minutes.</p>'}}}const b=["radical","onestar","tokyonight","dracula"];async function E(e){if(!e)return;e.classList.add("loading");let t=g().trophyTheme;t||(t=b[Math.floor(Math.random()*b.length)],f({trophyTheme:t}));const s=`https://github-profile-trophy.vercel.app/?username=${m}&theme=${t}&no-frame=true&no-bg=true&margin-w=4`;e.innerHTML=`
    <div class="trophy-wrap">
      <img class="trophy-img" loading="lazy" decoding="async"
           alt="GitHub trophies for ${m}"
           src="${s}"
           onerror="this.parentElement.classList.add('trophy-failed')">
    </div>`,e.querySelector(".trophy-img")?.addEventListener("load",()=>{e.classList.remove("loading"),e.classList.add("loaded")},{once:!0}),setTimeout(()=>{e.classList.contains("loading")&&(e.classList.remove("loading"),e.classList.add(e.querySelector(".trophy-failed")?"error":"loaded"))},4e3)}async function F(e){if(e){e.classList.add("loading");try{let t=g().quote;t||(t=await v(),t&&f({quote:t})),t?h(e,t):p(e),e.querySelector(".quote-refresh")?.addEventListener("click",async()=>{e.classList.add("loading");try{const s=await v();s?(f({quote:s}),h(e,s)):t?h(e,t):p(e)}catch{t?h(e,t):p(e)}finally{e.classList.remove("loading")}}),e.classList.remove("loading"),e.classList.add("loaded")}catch(n){console.warn("quote failed:",n),e.classList.remove("loading"),e.classList.add("error"),p(e)}}}async function v(){const e=(a,i)=>Promise.race([a,new Promise((l,c)=>setTimeout(()=>c(new Error("timeout")),i))]),n=e(fetch("https://api.adviceslip.com/advice").then(a=>a.ok?a.json():null),4e3).then(a=>a?.slip?.advice?{content:a.slip.advice,author:"Advice Slip"}:null).catch(()=>null),t=e(fetch("https://zenquotes.io/api/random").then(a=>a.ok?a.json():null),4e3).then(a=>Array.isArray(a)&&a[0]?.q?{content:a[0].q,author:a[0].a||"Unknown"}:null).catch(()=>null);return await Promise.any([n,t])||null}function p(e){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>Programs must be written for people to read, and only incidentally for machines to execute.</p>
    <cite>— Harold Abelson</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}function h(e,n){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>${y(n.content)}</p>
    <cite>— ${y(n.author)}</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}async function D(e,n){if(!e)return;e.classList.add("loading");const t=n||A();if(!t){e.classList.remove("loading"),e.classList.add("error"),e.innerHTML='<p class="widget-empty">Snake paused — heatmap not loaded yet.</p>';return}const s=t.length,a=t[0]?.length||7,i=[];for(let d=0;d<s;d++)for(let r=0;r<a;r++)i.push({c:d,r,level:t[d][r]});const l=H(t),c=l.length,o=70,u=c*o/1e3,$=18;e.innerHTML=`<div class="snake-wrap" role="img" aria-label="Contribution snake animation across ${s} weeks of activity">
    <div class="snake-grid">${i.map(({c:d,r,level:k})=>`<span class="snake-cell" style="--c:${d};--r:${r};--lvl:${k}"></span>`).join("")}</div>
    <svg class="snake-svg" viewBox="0 0 ${s} ${a}" preserveAspectRatio="none">
      <path class="snake-trail" d="${M(l)}" fill="none"
            stroke="rgba(34,211,238,0.25)" stroke-width="0.18"/>
      <circle class="snake-head" r="0.36" fill="#22d3ee">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${u}s" repeatCount="indefinite"/>
        <animateMotion dur="${u}s" repeatCount="indefinite" path="${L(l)}"/>
      </circle>
      ${Array.from({length:$},(d,r)=>`
        <circle class="snake-body snake-body-${r}" r="${.3-r*.012}" fill="#22d3ee" fill-opacity="${.95-r*.04}">
          <animateMotion dur="${u}s" repeatCount="indefinite"
                         path="${L(l)}"
                         begin="-${r*o/1e3}s"/>
        </circle>`).join("")}
    </svg>
  </div>`,e.classList.remove("loading"),e.classList.add("loaded")}function M(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)} ${t.toFixed(2)}`).join(" L "):""}function L(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)},${t.toFixed(2)}`).join(" L "):""}function A(){const e=[...document.querySelectorAll(".heat-cell:not(.empty)")];if(e.length<7)return null;const n=[];for(let t=0;t<e.length;t+=7){const s=[];for(let a=0;a<7&&t+a<e.length;a++){const l=e[t+a].className.match(/level-(\d)/);s.push(l?parseInt(l[1],10):0)}n.push(s)}return n}function H(e){const n=e.length;if(!n)return[];const t=[];for(let s=n-1;s>=0;s--){const a=e[s];let i=0,l=-1;for(let c=0;c<a.length;c++)a[c]>l&&(l=a[c],i=c);if(t.push([s+.5,i+.5]),s>0&&Math.random()<.3){const c=e[s-1],o=[i-1,i+1].filter(u=>u>=0&&u<c.length);if(o.length){const u=o[Math.floor(Math.random()*o.length)];t.push([s+.5,u+.5]),t.push([s-.5,u+.5])}}}return t}export{F as initQuote,D as initSnake,C as initTopLanguages,E as initTrophies};
