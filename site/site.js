(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const themeButton = document.querySelector("[data-theme-toggle]");
  const menuButton = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");
  const preferredDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = () => localStorage.getItem("nemo-theme") || "system";
  const iconPath = (name) => {
    const current = themeButton?.querySelector("img")?.getAttribute("src") || "";
    return current.replace(/[^/]+\.svg$/, `${name}.svg`);
  };
  const applyTheme = (theme) => {
    root.classList.toggle("dark", theme === "dark" || (theme === "system" && preferredDark()));
    const image = themeButton?.querySelector("img");
    if (image) image.src = iconPath(theme === "light" ? "sun" : theme === "dark" ? "moon" : "system");
  };
  applyTheme(currentTheme());
  themeButton?.addEventListener("click", () => {
    const themes = ["system", "light", "dark"];
    const next = themes[(themes.indexOf(currentTheme()) + 1) % themes.length];
    localStorage.setItem("nemo-theme", next); applyTheme(next);
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (currentTheme() === "system") applyTheme("system"); });

  const setupHomeMotion = () => {
    const intro = document.querySelector("[data-site-intro]");
    const paletteParam = new URLSearchParams(location.search).get("palette") || "01";
    const paletteId = /^(0[1-9]|1[01])$/.test(paletteParam) ? paletteParam : "01";
    if (intro) intro.dataset.palette = paletteId;
    const introCanvas = document.querySelector("[data-intro-canvas]");
    const introProgress = document.querySelector("[data-intro-progress]");
    const introState = document.querySelector("[data-intro-state]");
    const introLog = document.querySelector("[data-intro-log]");
    const introMeter = document.querySelector("[data-intro-meter]");
    const introOsMark = document.querySelector("[data-intro-os-mark]");
    const osDrawPaths = [...document.querySelectorAll(".os-draw circle,.os-draw path")];
    const osGuides = [...document.querySelectorAll(".os-guides circle,.os-guides line")];
    const osNodes = [...document.querySelectorAll(".os-nodes circle")];
    const osFinal = document.querySelector(".os-final");
    const osCaption = document.querySelector(".intro-os-caption");
    const introSteps = [...document.querySelectorAll("[data-intro-step]")];
    const stageSpecs = [
      { name: "IDENT", detail: "owner signature verified", log: "IDENT / Nemo 1st signature verified." },
      { name: "PLOT", detail: "construction grid", log: "PLOT / Mapping N/OS construction field." },
      { name: "KERNEL", detail: "joining signal nodes", log: "KERNEL / Joining signal nodes." },
      { name: "SYSTEM", detail: "locking N/OS core", log: "SYSTEM / Locking operating system mark." },
    ];
    introSteps.forEach((step, index) => {
      const spec = stageSpecs[index];
      const name = step.querySelector("span");
      const detail = step.querySelector("small");
      if (name && spec) name.textContent = spec.name;
      if (detail && spec) detail.textContent = spec.detail;
    });
    const identityLabel = intro?.querySelector(".intro-identity .hero-panel-label span");
    const identityNode = intro?.querySelector(".intro-identity .hero-panel-label b");
    const flowLabel = intro?.querySelector(".intro-interface .hero-panel-label span");
    const startupTitle = intro?.querySelector(".intro-startup-note span");
    const startupDetail = intro?.querySelector(".intro-startup-note p");
    if (identityLabel) identityLabel.textContent = "NEMO IDENTITY / VERIFIED";
    if (identityNode) identityNode.textContent = "USER.01";
    if (flowLabel) flowLabel.textContent = "N/OS FORMATION / 04";
    if (startupTitle) startupTitle.textContent = "SIGNATURE VERIFIED / SESSION 01";
    if (startupDetail) startupDetail.textContent = "OWNER: NEMO1ST / SYSTEM IMAGE: PENDING";
    const introLogo = intro?.querySelector(".intro-brand h1");
    introLogo?.setAttribute("aria-label", "Nemo 1st");
    osDrawPaths.forEach((path) => { path.style.strokeDasharray = "1"; path.style.strokeDashoffset = "1"; });
    osGuides.forEach((guide) => { guide.style.opacity = "0"; });
    osNodes.forEach((node) => { node.style.opacity = "0"; });
    const skipIntro = document.querySelector("[data-intro-skip]");
    if (skipIntro) skipIntro.textContent = "Bypass sequence";
    if (!intro || !introCanvas) return;

    const vertexShader = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
    const fragmentShader = `
      precision highp float;
      uniform vec2 resolution;
      uniform vec2 pointer;
      uniform float time;
      uniform float reveal;
      uniform vec3 accent;

      float smin(float a,float b,float k){
        float h=clamp(.5+.5*(b-a)/k,0.,1.);
        return mix(b,a,h)-k*h*(1.-h);
      }
      float ribbon(vec2 p,float phase,float spread){
        float distanceField=8.;
        for(int index=0;index<12;index++){
          float i=float(index);
          float angle=i*.47+phase+sin(time*.19+phase)*.85;
          float radius=.16+i*.072+sin(time*.31+i*.63+phase)*.06;
          vec2 position=vec2(cos(angle),sin(angle))*radius;
          position.x+=sin(i*.72+time*.47+phase)*.25*spread;
          position.y+=cos(i*.51-time*.38+phase)*.18*spread;
          position+=pointer*.13*vec2(sin(i+phase),cos(i*.8+phase));
          float bead=.145+.035*sin(i*.81-time*.53+phase);
          distanceField=smin(distanceField,length(p-position)-bead,.21);
        }
        return distanceField;
      }
      float scene(vec2 p){
        float first=ribbon(p,0.,1.);
        float second=ribbon(p*vec2(1.08,.94)+vec2(-.1,.04),2.17,.82);
        float third=ribbon(p*vec2(.91,1.12)+vec2(.08,-.08),4.28,.68);
        return smin(smin(first,second,.13),third,.11);
      }
      float random(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 p=(gl_FragCoord.xy*2.-resolution.xy)/resolution.y;
        p.x-=mix(.05,.38,smoothstep(700.,1300.,resolution.x));
        float entrance=mix(1.9,1.,smoothstep(0.,.72,reveal));
        p*=entrance;
        float d=scene(p);
        float epsilon=.0035;
        vec2 normal=normalize(vec2(scene(p+vec2(epsilon,0.))-scene(p-vec2(epsilon,0.)),scene(p+vec2(0.,epsilon))-scene(p-vec2(0.,epsilon))));
        float body=smoothstep(.018,-.025,d);
        float rim=exp(-abs(d)*22.);
        float light=pow(max(dot(normal,normalize(vec2(-.62,.78))),0.),8.);
        float backLight=pow(max(dot(normal,normalize(vec2(.72,-.35))),0.),12.);
        float oil=.5+.5*sin((p.x*normal.y-p.y*normal.x)*13.+time*.24);
        oil=pow(oil,6.);
        vec3 background=vec3(.004+.006*max(0.,1.-length(p)*.42));
        vec3 ink=vec3(.009,.011,.012);
        ink+=light*vec3(.24,.29,.31);
        ink+=backLight*accent*.18;
        ink+=oil*accent*.07;
        vec3 color=mix(background,ink,body);
        color+=rim*accent*.1*(.28+.72*body);
        color+=vec3((random(gl_FragCoord.xy+time)-.5)/255.);
        color*=smoothstep(0.,.18,reveal);
        gl_FragColor=vec4(color,1.);
      }`;

    const makeScene = (canvas, maxDpr = 1.8, accent = [.47,.64,.72]) => {
      const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "high-performance" });
      if (!gl) return null;
      const compile = (type, source) => {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
        return shader;
      };
      const program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShader));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShader));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      const uniforms = {
        resolution: gl.getUniformLocation(program, "resolution"),
        pointer: gl.getUniformLocation(program, "pointer"),
        time: gl.getUniformLocation(program, "time"),
        reveal: gl.getUniformLocation(program, "reveal"),
        accent: gl.getUniformLocation(program, "accent"),
      };
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      return {
        setPointer(x, y) { targetX = x; targetY = y; },
        draw(now, revealAmount = 1) {
          const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
          const rect = canvas.getBoundingClientRect();
          const width = Math.max(1, Math.round(rect.width * dpr));
          const height = Math.max(1, Math.round(rect.height * dpr));
          if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
          currentX += (targetX - currentX) * .045;
          currentY += (targetY - currentY) * .045;
          gl.uniform2f(uniforms.resolution, width, height);
          gl.uniform2f(uniforms.pointer, currentX, currentY);
          gl.uniform1f(uniforms.time, now * .001);
          gl.uniform1f(uniforms.reveal, revealAmount);
          gl.uniform3f(uniforms.accent, accent[0], accent[1], accent[2]);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        },
        destroy() { gl.deleteBuffer(buffer); gl.deleteProgram(program); },
      };
    };

    let introScene;
    try {
      const accentHex = getComputedStyle(intro).getPropertyValue("--intro-blue-light").trim();
      const accentMatch = accentHex.match(/^#([0-9a-f]{6})$/i);
      const accent = accentMatch ? [0,2,4].map((offset) => parseInt(accentMatch[1].slice(offset, offset + 2), 16) / 255) : undefined;
      introScene = makeScene(introCanvas, innerWidth < 640 ? .72 : .9, accent);
    } catch (error) {
      console.warn("Organic WebGL scene unavailable", error);
    }

    let frame = 0;
    let finished = !intro || !introCanvas || reducedMotion.matches;
    const startedAt = performance.now();
    const sequenceDuration = 5200;
    const exitDuration = 800;
    const finishIntro = () => {
      if (finished) return;
      finished = true;
      intro.classList.add("is-leaving");
      document.body.classList.remove("intro-running");
      window.setTimeout(() => { introScene?.destroy(); intro.remove(); }, exitDuration + 40);
    };
    if (finished) intro?.remove(); else document.body.classList.add("intro-running");
    const stageLogs = stageSpecs.map((stage) => stage.log);
    let osLocked = false;
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const animateOsMark = (progress) => {
      if (!introOsMark) return;
      const guideReveal = clamp01((progress - .04) / .2);
      const guideFade = 1 - clamp01((progress - .72) / .2);
      osGuides.forEach((guide, index) => {
        guide.style.opacity = String(guideReveal * guideFade * (.22 + (index % 3) * .08));
      });
      osDrawPaths.forEach((path, index) => {
        const drawn = clamp01((progress - (.16 + index * .1)) / .42);
        path.style.strokeDashoffset = String(1 - drawn);
      });
      osNodes.forEach((node, index) => {
        const amount = clamp01((progress - (.4 + index * .055)) / .12);
        node.style.opacity = String(amount);
        node.style.transform = `scale(${(.25 + amount * .75).toFixed(3)})`;
      });
      const solid = clamp01((progress - .7) / .14);
      if (osFinal) {
        osFinal.style.opacity = String(solid);
        osFinal.style.transform = `scale(${(.96 + solid * .04).toFixed(3)})`;
      }
      if (osCaption) {
        osCaption.style.opacity = String(clamp01((progress - .76) / .12));
        osCaption.style.transform = `translate(-50%,${((1 - clamp01((progress - .76) / .12)) * 10).toFixed(2)}px)`;
      }
      if (!osLocked && progress > .84) {
        osLocked = true;
        introOsMark.classList.add("is-locked");
      }
    };
    let lastIntroDraw = -Infinity;
    const draw = (now) => {
      if (!finished) {
        const progress = Math.min(1, (now - startedAt) / sequenceDuration);
        const activeStage = Math.min(introSteps.length - 1, Math.floor(progress * introSteps.length));
        animateOsMark(progress);
        if (now - lastIntroDraw >= 32) {
          introScene?.setPointer(Math.sin(now * .00031) * .22, Math.cos(now * .00027) * .16);
          introScene?.draw(now, progress);
          lastIntroDraw = now;
        }
        introSteps.forEach((step, index) => {
          const status = step.querySelector("em");
          step.classList.toggle("is-active", index === activeStage && progress < 1);
          step.classList.toggle("is-complete", index < activeStage || progress >= 1);
          if (status) status.textContent = index < activeStage || progress >= 1 ? "LOCK" : index === activeStage ? "LIVE" : "IDLE";
        });
        if (introState) introState.textContent = progress >= 1 ? "SYSTEM READY" : `PHASE / 0${activeStage + 1}`;
        if (introLog) introLog.textContent = progress >= 1 ? "N/OS ONLINE / Entering archive." : stageLogs[activeStage];
        if (introMeter) introMeter.style.width = `${progress * 100}%`;
        if (introProgress) introProgress.textContent = `${String(Math.round(progress * 100)).padStart(3, "0")}%`;
        if (progress >= 1) finishIntro();
      }
      if (!finished) frame = requestAnimationFrame(draw);
    };
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
    skipIntro?.addEventListener("click", finishIntro);
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") finishIntro(); });
    window.addEventListener("beforeunload", () => { cancelAnimationFrame(frame); introScene?.destroy(); }, { once: true });
  };
  setupHomeMotion();

  menuButton?.addEventListener("click", () => {
    const open = nav?.toggleAttribute("data-open");
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });

  const tabs = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll("[data-panel]")];
  const selectTab = (name) => {
    tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.tab === name)));
    panels.forEach((panel) => { panel.hidden = panel.dataset.panel !== name; });
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));
  if (location.hash === "#shorts" && tabs.length) selectTab("shorts");

  const dialog = document.querySelector("[data-search-dialog]");
  const input = document.querySelector("[data-search-input]");
  const results = document.querySelector("[data-search-results]");
  let searchIndex = [];
  try { searchIndex = JSON.parse(document.querySelector("#search-index")?.textContent || "[]"); } catch {}
  const openSearch = () => { dialog?.showModal(); setTimeout(() => input?.focus(), 0); };
  document.querySelector("[data-search-open]")?.addEventListener("click", openSearch);
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
  });
  input?.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) { results.innerHTML = "<p>タイトルや概要から記事を検索できます。</p>"; return; }
    const matches = searchIndex.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query));
    results.replaceChildren(...(matches.length ? matches.map((item) => {
      const link = document.createElement("a"); link.href = item.href;
      const title = document.createElement("strong"); title.textContent = item.title;
      const summary = document.createElement("span"); summary.textContent = item.description;
      link.append(title, summary); return link;
    }) : [Object.assign(document.createElement("p"), { textContent: "該当する記事はありません。" })]));
  });

  const tocButton = document.querySelector("[data-toc-toggle]");
  const tocList = document.querySelector("[data-toc-list]");
  tocButton?.addEventListener("click", () => {
    tocList.hidden = !tocList.hidden;
    tocButton.setAttribute("aria-expanded", String(!tocList.hidden));
  });

  document.querySelector("[data-copy-url]")?.addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(location.href);
    const button = event.currentTarget, original = button.textContent;
    button.textContent = "コピーしました";
    setTimeout(() => { button.textContent = original; }, 1600);
  });

  const interview = document.querySelector("[data-interview]");
  if (interview) {
    const items = [...interview.querySelectorAll("[data-interview-item]")];
    const skip = interview.querySelector("[data-interview-skip]");
    const ending = interview.querySelector("[data-interview-end]");
    const textTargets = [...interview.querySelectorAll("[data-interview-text]")];
    const originals = new Map(textTargets.map((target) => [target, target.textContent || ""]));
    let cancelled = false;
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const showAll = () => {
      cancelled = true;
      items.forEach((item) => { item.hidden = false; });
      textTargets.forEach((target) => { target.textContent = originals.get(target); });
      ending.hidden = false;
      skip.hidden = true;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
    } else {
      items.forEach((item) => { item.hidden = true; });
      textTargets.forEach((target) => { target.textContent = ""; });
      ending.hidden = true;
      skip.addEventListener("click", showAll);
      (async () => {
        for (const item of items) {
          if (cancelled) return;
          item.hidden = false;
          const targets = [...item.querySelectorAll("[data-interview-text]")];
          for (const target of targets) {
            const full = originals.get(target);
            const text = document.createTextNode("");
            const cursor = document.createElement("span");
            cursor.className = "typing-cursor";
            cursor.setAttribute("aria-hidden", "true");
            target.replaceChildren(text, cursor);
            for (let index = 1; index <= full.length; index += 1) {
              if (cancelled) return;
              text.data = full.slice(0, index);
              await wait(12);
            }
            cursor.remove();
          }
          await wait(420);
        }
        ending.hidden = false;
        skip.hidden = true;
      })();
    }
  }
})();
