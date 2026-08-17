import{W as C,S as F,P as B,C as x,B as W,a as p,b as A,A as R,c as U,d as _,D as k,M as D,e as G}from"./three-B2CCr1hy.js";import{g as H}from"./index-DMpVtu1L.js";function q(){const w=H();if(!w.canRender3D){document.body.classList.add("no-motion");return}const h=document.getElementById("aurora");if(!h)return;const i=new C({canvas:h,antialias:!0,alpha:!0,powerPreference:"high-performance"});i.setPixelRatio(w.dpr),i.setSize(window.innerWidth,window.innerHeight,!1);const m=new F,s=new B(60,window.innerWidth/window.innerHeight,.1,1e3);s.position.z=30;const l={dark:["#22d3ee","#a855f7","#ec4899","#84cc16"].map(e=>new x(e)),light:["#0ea5e9","#8b5cf6","#db2777","#65a30d"].map(e=>new x(e))};let n=l[document.body.dataset.theme]||l.dark;const a=600,c=new Float32Array(a*3),o=new Float32Array(a*3),g=new Float32Array(a);for(let e=0;e<a;e++){c[e*3+0]=(Math.random()-.5)*80,c[e*3+1]=(Math.random()-.5)*50,c[e*3+2]=(Math.random()-.5)*40;const t=n[Math.floor(Math.random()*n.length)];o[e*3+0]=t.r,o[e*3+1]=t.g,o[e*3+2]=t.b,g[e]=Math.random()*1.6+.4}const r=new W;r.setAttribute("position",new p(c,3)),r.setAttribute("color",new p(o,3)),r.setAttribute("aSize",new p(g,1));const M=`
    attribute float aSize;
    varying vec3 vColor;
    uniform float uTime;
    uniform float uPixelRatio;
    void main() {
      vColor = color;
      vec3 p = position;
      p.y += sin(uTime * 0.3 + position.x * 0.1) * 0.6;
      p.x += cos(uTime * 0.2 + position.y * 0.1) * 0.6;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = aSize * uPixelRatio * (300.0 / -mv.z);
      gl_Position = projectionMatrix * mv;
    }
  `,T=`
    varying vec3 vColor;
    void main() {
      vec2 c = gl_PointCoord - vec2(0.5);
      float d = length(c);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vColor, a * 0.85);
    }
  `,b=new A({vertexShader:M,fragmentShader:T,uniforms:{uTime:{value:0},uPixelRatio:{value:i.getPixelRatio()}},vertexColors:!0,transparent:!0,depthWrite:!1,blending:R}),S=new U(r,b);m.add(S);const z=new _(80,50,40,25),d=new A({uniforms:{uTime:{value:0},uPaletteA:{value:n[0]},uPaletteB:{value:n[2]}},vertexShader:`
      varying vec2 vUv;
      uniform float uTime;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.z += sin(p.x * 0.3 + uTime * 0.5) * 1.5;
        p.z += cos(p.y * 0.4 + uTime * 0.3) * 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,fragmentShader:`
      varying vec2 vUv;
      uniform vec3 uPaletteA;
      uniform vec3 uPaletteB;
      uniform float uTime;
      void main() {
        vec2 c = vUv - 0.5;
        float d = length(c);
        float a = smoothstep(0.7, 0.0, d) * 0.18;
        vec3 col = mix(uPaletteA, uPaletteB, 0.5 + 0.5 * sin(uTime * 0.3 + vUv.x * 6.0));
        gl_FragColor = vec4(col, a);
      }
    `,transparent:!0,depthWrite:!1,side:k}),P=new D(z,d);P.position.z=-10,m.add(P),window.addEventListener("resize",()=>{i.setSize(window.innerWidth,window.innerHeight,!1),s.aspect=window.innerWidth/window.innerHeight,s.updateProjectionMatrix()}),new MutationObserver(()=>{const e=l[document.body.dataset.theme]||l.dark;n=e,d.uniforms.uPaletteA.value.copy(e[0]),d.uniforms.uPaletteB.value.copy(e[2]);for(let t=0;t<a;t++){const f=e[Math.floor(Math.random()*e.length)];o[t*3+0]=f.r,o[t*3+1]=f.g,o[t*3+2]=f.b}r.attributes.color.needsUpdate=!0}).observe(document.body,{attributes:!0,attributeFilter:["data-theme"]});const y=new G;let u;function v(){b.uniforms.uTime.value=y.elapsedTime,d.uniforms.uTime.value=y.elapsedTime,i.render(m,s),u=requestAnimationFrame(v)}u=requestAnimationFrame(v),document.addEventListener("visibilitychange",()=>{document.hidden?cancelAnimationFrame(u):u=requestAnimationFrame(v)})}export{q as initAurora};
