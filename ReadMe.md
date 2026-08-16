<!-- sabbirimon — Animated Glassmorphism README
     ─────────────────────────────────────────────
     Hero: SMIL-animated SVG with aurora gradient, floating glass orbs,
           and a typewriter-illusion headline.
     Sections below preserve the original GPRM content but are wrapped in
     a glass card layout and styled with embedded CSS keyframes.
     GitHub strips <script>, so JS-based animation degrades to the SMIL +
     CSS layers (still very pretty on github.com). -->

<table align="center">
  <tr>
    <td align="center">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="assets/hero.svg">
        <source media="(prefers-color-scheme: light)" srcset="assets/hero.svg">
        <img alt="Sabbirimon — DevOps engineer · 5G/RAN explorer · Open-source tinkerer"
             src="assets/hero.svg" width="100%" style="max-width:760px; border-radius:18px;">
      </picture>
    </td>
    <td align="center" valign="middle" width="320">
      <!-- 📡 Wireless radio effect: animated broadcast tower + expanding arcs.
           Pure SVG + SMIL — works on github.com. -->
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="assets/radio-waves.svg">
        <source media="(prefers-color-scheme: light)" srcset="assets/radio-waves.svg">
        <img alt="5G / RAN — broadcast tower with expanding signal arcs and signal-strength bars"
             src="assets/radio-waves.svg"
             width="280"
             style="border-radius:18px; background:rgba(10,10,31,0.55);
                    box-shadow:0 0 28px rgba(168,85,247,0.35), 0 1px 0 rgba(255,255,255,0.10) inset;">
      </picture>
    </td>
  </tr>
</table>

<!-- Mobile fallback: stack radio waves below hero on narrow screens -->
<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/radio-waves.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/radio-waves.svg">
    <img alt="5G / RAN — broadcast tower with expanding signal arcs"
         src="assets/radio-waves.svg"
         width="220"
         class="radio-mobile"
         style="display:none; border-radius:18px; background:rgba(10,10,31,0.55);
                box-shadow:0 0 28px rgba(168,85,247,0.35);">
  </picture>
</div>

<p align="center">
  <img alt="views" src="https://visitcount.itsvg.in/api?id=sabbirimon&icon=2&color=13">
  <a href="https://github.com/sabbirimon"><img alt="followers" src="https://img.shields.io/github/followers/sabbirimon?style=for-the-badge&logo=github&color=22d3ee&labelColor=0a0a1f"></a>
  <a href="https://github.com/sabbirimon"><img alt="stars" src="https://img.shields.io/github/stars/sabbirimon?style=for-the-badge&logo=github&color=a855f7&labelColor=0a0a1f"></a>
</p>

<div align="center">

<!-- ✨ Animated glass-orb row — pure CSS keyframes, no JS, renders on github.com -->
<table>
  <tr>
    <td align="center" width="120">
      <div class="orb orb-cyan"></div>
      <br><sub><b>Cloud</b></sub>
    </td>
    <td align="center" width="120">
      <div class="orb orb-purple"></div>
      <br><sub><b>DevOps</b></sub>
    </td>
    <td align="center" width="120">
      <div class="orb orb-pink"></div>
      <br><sub><b>5G/RAN</b></sub>
    </td>
    <td align="center" width="120">
      <div class="orb orb-lime"></div>
      <br><sub><b>Open-source</b></sub>
    </td>
  </tr>
</table>

</div>

<style>
  /* Animated glass-orb row */
  .orb {
    width:64px;height:64px;border-radius:50%;
    margin:0 auto;
    box-shadow:
      0 0 32px 8px rgba(255,255,255,0.18) inset,
      0 8px 24px rgba(0,0,0,0.45);
    animation: orbFloat 6s ease-in-out infinite;
    transition: transform 0.3s ease;
  }
  .orb-cyan   { background: radial-gradient(circle at 30% 30%, #67e8f9, #06b6d4 50%, #0e7490); animation-delay: 0s; }
  .orb-purple { background: radial-gradient(circle at 30% 30%, #d8b4fe, #a855f7 50%, #6b21a8); animation-delay: 1.5s; }
  .orb-pink   { background: radial-gradient(circle at 30% 30%, #fbcfe8, #ec4899 50%, #9d174d); animation-delay: 3s; }
  .orb-lime   { background: radial-gradient(circle at 30% 30%, #d9f99d, #84cc16 50%, #3f6212); animation-delay: 4.5s; }
  @keyframes orbFloat {
    0%,100% { transform: translateY(0)   scale(1);   filter: hue-rotate(0deg); }
    50%     { transform: translateY(-10px) scale(1.06); filter: hue-rotate(40deg); }
  }

  /* Glass card (used for section wrappers) */
  .glass {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 18px;
    padding: 22px 26px;
    margin: 18px 0;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow:
      0 1px 0 rgba(255,255,255,0.10) inset,
      0 12px 40px rgba(0,0,0,0.35);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }
  .glass:hover {
    transform: translateY(-2px);
    box-shadow:
      0 1px 0 rgba(255,255,255,0.18) inset,
      0 18px 50px rgba(168,85,247,0.25);
  }
  .glass h2, .glass h3 {
    background: linear-gradient(90deg, #22d3ee, #a855f7, #ec4899, #84cc16);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    background-size: 300% 100%;
    animation: shine 8s linear infinite;
  }
  @keyframes shine {
    0%   { background-position: 0% 50%; }
    100% { background-position: 300% 50%; }
  }

  /* Animated chip list — replaces plain tech-stack shields visually */
  .chip {
    display:inline-block;
    margin:4px 4px;
    padding:6px 12px;
    border-radius:999px;
    font-size:13px;
    font-weight:600;
    border:1px solid currentColor;
    background: rgba(255,255,255,0.04);
    transition: transform 0.25s ease, background 0.25s ease;
    position: relative;
  }
  .chip:hover { transform: translateY(-2px) scale(1.04); background: rgba(255,255,255,0.10); }

  /* 📡 CSS-only Wi-Fi / signal arcs — drawn with border-radius trick */
  .signal {
    display:inline-block;
    width: 14px; height: 14px;
    margin-right: 6px;
    vertical-align: -2px;
    position: relative;
  }
  .signal::before, .signal::after {
    content: "";
    position: absolute;
    left: 50%; bottom: 0;
    transform: translateX(-50%);
    border: 2px solid transparent;
    border-bottom-color: currentColor;
    border-radius: 50%;
    width: 12px; height: 12px;
    opacity: 0.7;
    animation: signalArc 2s ease-out infinite;
  }
  .signal::after {
    width: 6px; height: 6px;
    animation-delay: 0.3s;
  }
  .signal-dot {
    position: absolute;
    left: 50%; bottom: -1px;
    transform: translateX(-50%);
    width: 4px; height: 4px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 8px currentColor;
    animation: signalDot 2s ease-in-out infinite;
  }
  @keyframes signalArc {
    0%   { transform: translateX(-50%) scale(0.4); opacity: 0; }
    20%  { opacity: 1; }
    100% { transform: translateX(-50%) scale(1.4); opacity: 0; }
  }
  @keyframes signalDot {
    0%, 100% { transform: translateX(-50%) translateY(0); }
    50%      { transform: translateX(-50%) translateY(-2px); }
  }

  /* Make all <a> hover glow */
  a:hover { text-shadow: 0 0 12px rgba(168,85,247,0.6); }

  /* Respect reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .orb, .glass h2, .glass h3 { animation: none !important; }
    .glass:hover { transform: none; }
  }
</style>

---

<div class="glass">

## <span style="color:#22d3ee" class="signal"><span class="signal-dot"></span></span>💫 About Me

🔭 I’m currently working at **Poridhi.io** as a Junior DevOps Engineer  
🌱 I’m currently learning **RAN, SDN, and Python**  
💬 Ask me about **GSM, LTE, 5G, CCNA, Linux, Docker**

</div>

---

<div class="glass">

## <span style="color:#a855f7" class="signal"><span class="signal-dot"></span></span>🌐 Socials

<p>
  <a href="https://linkedin.com/in/sabbirimon"><img src="https://img.shields.io/badge/LinkedIn-%230077B5.svg?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
  <a href="https://medium.com/@sabbirimon"><img src="https://img.shields.io/badge/Medium-12100E?style=for-the-badge&logo=medium&logoColor=white" alt="Medium"></a>
  <a href="https://youtube.com/@sabbirimon"><img src="https://img.shields.io/badge/YouTube-%23FF0000.svg?style=for-the-badge&logo=YouTube&logoColor=white" alt="YouTube"></a>
</p>

</div>

---

<div class="glass">

## <span style="color:#ec4899" class="signal"><span class="signal-dot"></span></span>💻 Tech Stack

<p>
  <span class="chip" style="color:#ffdd54">Python</span>
  <span class="chip" style="color:#f7df1e">JavaScript</span>
  <span class="chip" style="color:#ff9900">AWS</span>
  <span class="chip" style="color:#4285f4">Google Cloud</span>
  <span class="chip" style="color:#0072c6">Azure</span>
  <span class="chip" style="color:#ff0000">Adobe</span>
  <span class="chip" style="color:#31a8ff">Lightroom</span>
  <span class="chip" style="color:#9999ff">Premiere Pro</span>
  <span class="chip" style="color:#31a8ff">Photoshop</span>
  <span class="chip" style="color:#0db7ed">Docker</span>
  <span class="chip" style="color:#326ce5">Kubernetes</span>
</p>

</div>

---

<div class="glass">

## <span style="color:#84cc16" class="signal"><span class="signal-dot"></span></span>📊 GitHub Stats

<p align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=sabbirimon&theme=dark&hide_border=false&include_all_commits=false&count_private=false" alt="GitHub stats"/>
  <br/>
  <img src="https://github-readme-streak-stats.herokuapp.com/?user=sabbirimon&theme=dark&hide_border=false" alt="Streak stats"/>
  <br/>
  <img src="https://github-readme-stats.vercel.app/api/top-langs/?username=sabbirimon&theme=dark&hide_border=false&include_all_commits=false&count_private=false&layout=compact" alt="Top languages"/>
</p>

</div>

---

<div class="glass">

## 🏆 GitHub Trophies

<p align="center">
  <img src="https://github-profile-trophy.vercel.app/?username=sabbirimon&theme=radical&no-frame=false&no-bg=true&margin-w=4" alt="GitHub trophies"/>
</p>

</div>

---

<div class="glass">

## ✍️ Random Dev Quote

<p align="center">
  <img src="https://quotes-github-readme.vercel.app/api?type=horizontal&theme=merko" alt="Random dev quote"/>
</p>

</div>

---

<div class="glass">

## 🔝 Top Contributed Repos

<p align="center">
  <img src="https://github-contributor-stats.vercel.app/api?username=sabbirimon&limit=5&theme=dark&combine_all_yearly_contributions=true" alt="Top contributed repos"/>
</p>

</div>

---

<div class="glass">

## 🐍 Contribution Snake

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/platane/platane/output/github-contribution-grid-snake-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/platane/platane/output/github-contribution-grid-snake.svg">
    <img alt="github contribution grid snake animation" src="https://raw.githubusercontent.com/platane/platane/output/github-contribution-grid-snake.svg">
  </picture>
</p>

</div>

---

<div class="glass">

## 💖 Support My Work

<p align="center">
  <a href="https://buymeacoffee.com/sabbirimon">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy me a coffee"/>
  </a>
</p>

<p align="center">
  <a href="https://ibb.co/svJn3dDT">
    <img src="https://i.ibb.co/svJn3dDT/bmc-qr.png" alt="BMC QR" width="192" height="192" style="border-radius:14px; box-shadow:0 0 24px rgba(168,85,247,0.4);"/>
  </a>
</p>

</div>

---

<div class="glass" align="center">

### 😂 Random Dev Meme

<img src="https://memer-new.vercel.app/" style="height:400px; border-radius:14px;" alt="Random dev meme"/>

</div>

---

<div class="glass" align="center">

### 🤖 Readme Jokes

<img src="https://readme-jokes.vercel.app/api" alt="Jokes Card" style="border-radius:14px;"/>

<sub>Powered by <a href="https://github.com/ABSphreak/readme-jokes">readme-jokes</a></sub>

</div>

---

<p align="center">
  <sub>
    <b style="background:linear-gradient(90deg,#22d3ee,#a855f7,#ec4899);-webkit-background-clip:text;background-clip:text;color:transparent;">
      ✨ Crafted with glassmorphism, aurora gradients &amp; love ✨
    </b>
    <br/>
    Proudly built with ❤ by <a href="https://github.com/sabbirimon">sabbirimon</a>
  </sub>
</p>