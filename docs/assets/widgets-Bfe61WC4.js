const S="https://api.github.com",y="sabbirimon",$="sabbirimon-widgets-v1";function b(e){return String(e??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}function m(){try{const e=sessionStorage.getItem($);if(!e)return{};const{ts:n,data:t}=JSON.parse(e);return Date.now()-n<6e5?t:{}}catch{return{}}}function g(e){try{const t={...m(),...e};sessionStorage.setItem($,JSON.stringify({ts:Date.now(),data:t}))}catch{}}async function T(){const e=m();if(e.repos)return e.repos;const n=await fetch(`${S}/users/${y}/repos?per_page=100&sort=updated`,{headers:{Accept:"application/vnd.github+json"}});if(!n.ok)throw new Error(`GitHub ${n.status}`);const t=await n.json();return g({repos:t}),t}const q={JavaScript:"#f1e05a",TypeScript:"#3178c6",Python:"#3572A5",Kotlin:"#A97BFF",Java:"#b07219",Go:"#00ADD8",Rust:"#dea584",HTML:"#e34c26",CSS:"#563d7c",C:"#555555","C++":"#f34b7d",Jupyter:"#DA5B0B",Shell:"#89e051",Dockerfile:"#384d54",Vue:"#41b883",Svelte:"#ff3e00",Ruby:"#701516",PHP:"#4F5D95",Swift:"#F05138",Dart:"#00B4AB",Lua:"#000080",SCSS:"#c6538c","Objective-C":"#438eff",R:"#198CE7",Perl:"#0298c3"};async function E(e){if(e){e.classList.add("loading");try{const n=await T(),t=new Map;for(const c of n)c.language&&t.set(c.language,(t.get(c.language)||0)+1);const s=[...t.values()].reduce((c,i)=>c+i,0)||1,a=[...t.entries()].sort((c,i)=>i[1]-c[1]).slice(0,8);if(!a.length){e.innerHTML='<p class="widget-empty">No language data on public repos yet.</p>';return}e.innerHTML=`<ul class="lang-list" aria-label="Top languages by repo count">${a.map(([c,i])=>{const u=Math.round(i/s*100),o=q[c]||"#a855f7";return`<li class="lang-row">
        <span class="lang-name"><i style="background:${o}"></i>${b(c)}</span>
        <span class="lang-bar"><span style="width:${u}%;background:${o}"></span></span>
        <span class="lang-pct">${u}%</span>
        <span class="lang-count">${i} ${i===1?"repo":"repos"}</span>
      </li>`}).join("")}</ul>`,e.classList.remove("loading")}catch(n){console.warn("topLanguages failed:",n),e.classList.remove("loading"),e.innerHTML='<p class="widget-empty">Language stats paused — try again in a few minutes.</p>'}}}const v=["radical","onestar","tokyonight","dracula"];async function F(e){if(!e)return;e.classList.add("loading");let t=m().trophyTheme;t||(t=v[Math.floor(Math.random()*v.length)],g({trophyTheme:t}));const s=`https://github-profile-trophy.vercel.app/?username=${y}&theme=${t}&no-frame=true&no-bg=true&margin-w=4`;e.innerHTML=`
    <div class="trophy-wrap">
      <img class="trophy-img" loading="lazy" decoding="async"
           alt="GitHub trophies for ${y}"
           src="${s}"
           onerror="this.parentElement.classList.add('trophy-failed')">
    </div>`,e.querySelector(".trophy-img")?.addEventListener("load",()=>{e.classList.remove("loading"),e.classList.add("loaded")},{once:!0}),setTimeout(()=>{e.classList.contains("loading")&&(e.classList.remove("loading"),e.classList.add(e.querySelector(".trophy-failed")?"error":"loaded"))},4e3)}async function P(e){if(e){e.classList.add("loading");try{let t=m().quote;t||(t=await w(),t&&g({quote:t})),t?f(e,t):h(e),e.querySelector(".quote-refresh")?.addEventListener("click",async()=>{e.classList.add("loading");try{const s=await w();s?(g({quote:s}),f(e,s)):t?f(e,t):h(e)}catch{t?f(e,t):h(e)}finally{e.classList.remove("loading")}}),e.classList.remove("loading"),e.classList.add("loaded")}catch(n){console.warn("quote failed:",n),e.classList.remove("loading"),e.classList.add("error"),h(e)}}}async function w(){const e=(a,c)=>Promise.race([a,new Promise((i,u)=>setTimeout(()=>u(new Error("timeout")),c))]),n=e(fetch("https://api.adviceslip.com/advice").then(a=>a.ok?a.json():null),4e3).then(a=>a?.slip?.advice?{content:a.slip.advice,author:"Advice Slip"}:null).catch(()=>null),t=e(fetch("https://zenquotes.io/api/random").then(a=>a.ok?a.json():null),4e3).then(a=>Array.isArray(a)&&a[0]?.q?{content:a[0].q,author:a[0].a||"Unknown"}:null).catch(()=>null);return await Promise.any([n,t])||null}function h(e){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>Programs must be written for people to read, and only incidentally for machines to execute.</p>
    <cite>— Harold Abelson</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}function f(e,n){e.innerHTML=`<blockquote class="dev-quote">
    <span class="quote-mark" aria-hidden="true">“</span>
    <p>${b(n.content)}</p>
    <cite>— ${b(n.author)}</cite>
    <button type="button" class="quote-refresh" aria-label="Fetch a new quote">↻ new quote</button>
  </blockquote>`}async function D(e,n){if(!e)return;e.classList.add("loading");let t=n;if(!t)for(let r=0;r<20&&(t=A(),!t);r++)await new Promise(l=>setTimeout(l,500));t||(t=H());const s=t.length,a=t[0]?.length||7,c=[];for(let r=0;r<s;r++)for(let l=0;l<a;l++)c.push({c:r,r:l,level:t[r][l]});const i=C(t),u=i.length,o=70,d=u*o/1e3,p=18;e.innerHTML=`<div class="snake-wrap" role="img" aria-label="Contribution snake animation across ${s} weeks of activity">
    <div class="snake-grid">${c.map(({c:r,r:l,level:k})=>`<span class="snake-cell" style="--c:${r};--r:${l};--lvl:${k}"></span>`).join("")}</div>
    <svg class="snake-svg" viewBox="0 0 ${s} ${a}" preserveAspectRatio="none">
      <path class="snake-trail" d="${M(i)}" fill="none"
            stroke="rgba(34,211,238,0.25)" stroke-width="0.18"/>
      <circle class="snake-head" r="0.36" fill="#22d3ee">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.95;1" dur="${d}s" repeatCount="indefinite"/>
        <animateMotion dur="${d}s" repeatCount="indefinite" path="${L(i)}"/>
      </circle>
      ${Array.from({length:p},(r,l)=>`
        <circle class="snake-body snake-body-${l}" r="${.3-l*.012}" fill="#22d3ee" fill-opacity="${.95-l*.04}">
          <animateMotion dur="${d}s" repeatCount="indefinite"
                         path="${L(i)}"
                         begin="-${l*o/1e3}s"/>
        </circle>`).join("")}
    </svg>
  </div>`,e.classList.remove("loading"),e.classList.add("loaded")}function M(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)} ${t.toFixed(2)}`).join(" L "):""}function L(e){return e.length?"M "+e.map(([n,t])=>`${n.toFixed(2)},${t.toFixed(2)}`).join(" L "):""}function A(){const e=[...document.querySelectorAll(".heat-cell:not(.empty)")];if(e.length<7)return null;const n=[];for(let t=0;t<e.length;t+=7){const s=[];for(let a=0;a<7&&t+a<e.length;a++){const i=e[t+a].className.match(/level-(\d)/);s.push(i?parseInt(i[1],10):0)}n.push(s)}return n}function C(e){const n=e.length;if(!n)return[];const t=[];let s=0;for(let a=n-1;a>=0;a--){const c=e[a];let i=s,u=-1;for(let o=0;o<c.length;o++){const d=Math.abs(o-s),p=c[o]*10-d*.5;p>u&&(u=p,i=o)}t.push([a+.5,i+.5]),s=i}return t}function H(){const e=[];for(let n=0;n<52;n++){const t=[];for(let s=0;s<7;s++){const a=Math.round((Math.sin(n*.3+s*.5)+1)*2);t.push(Math.max(0,Math.min(4,a)))}e.push(t)}return e}export{P as initQuote,D as initSnake,E as initTopLanguages,F as initTrophies};
