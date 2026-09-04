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
    const introCanvas = document.querySelector("[data-intro-canvas]");
    const introProgress = document.querySelector("[data-intro-progress]");
    const introState = document.querySelector("[data-intro-state]");
    const introLog = document.querySelector("[data-intro-log]");
    const introMeter = document.querySelector("[data-intro-meter]");
    const introActiveName = document.querySelector("[data-intro-active-name]");
    const introActiveStatus = document.querySelector("[data-intro-active-status]");
    const introActiveDetail = document.querySelector("[data-intro-active-detail]");
    const introSteps = [...document.querySelectorAll("[data-intro-step]")];
    const stageSpecs = [
      { name: "SIGNAL", detail: "identity handshake", log: "SIGNAL / Identity handshake accepted." },
      { name: "MORPH", detail: "geometric mark construction", log: "MORPH / Plotting geometric construction field." },
      { name: "ARCHIVE", detail: "memory constellation", log: "ARCHIVE / Mapping memory constellation." },
      { name: "GATE", detail: "interface release", log: "GATE / Releasing interface threshold." },
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
    if (identityLabel) identityLabel.textContent = "NEMO SIGNAL ARCHIVE";
    if (identityNode) identityNode.textContent = "NODE.01";
    if (flowLabel) flowLabel.textContent = "FORMATION SEQUENCE / 04";
    if (startupTitle) startupTitle.textContent = "IDENTITY RECONSTRUCTION / PHASE 01";
    if (startupDetail) startupDetail.textContent = "PRIVATE SIGNAL NODE: NEMO1ST / MEMORY ACCESS: LOCAL ONLY";
    const introLogo = intro?.querySelector(".intro-brand h1");
    const introLogoGlyphs = [];
    let introBlueprint;
    let introBlueprintLines = [];
    let introBlueprintGuides = [];
    if (introLogo) {
      introLogo.setAttribute("aria-label", "nemo1st");
      introBlueprint = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      introBlueprint.classList.add("intro-blueprint");
      introBlueprint.setAttribute("viewBox", "0 0 1000 620");
      introBlueprint.setAttribute("preserveAspectRatio", "xMidYMid meet");
      introBlueprint.setAttribute("aria-hidden", "true");
      introBlueprint.innerHTML = `
        <g class="blueprint-guides">
          <circle cx="500" cy="310" r="272" pathLength="1"/><circle cx="500" cy="310" r="184" pathLength="1"/><circle cx="500" cy="310" r="82" pathLength="1"/>
          <line x1="50" y1="160" x2="950" y2="160" pathLength="1"/><line x1="50" y1="310" x2="950" y2="310" pathLength="1"/><line x1="50" y1="460" x2="950" y2="460" pathLength="1"/>
          <line x1="500" y1="28" x2="500" y2="592" pathLength="1"/><line x1="110" y1="84" x2="890" y2="536" pathLength="1"/><line x1="110" y1="536" x2="890" y2="84" pathLength="1"/>
        </g>
        <g class="blueprint-structure">
          <rect x="126" y="176" width="748" height="268" pathLength="1"/>
          <line x1="126" y1="444" x2="304" y2="176" pathLength="1"/><line x1="148" y1="444" x2="326" y2="176" pathLength="1"/><line x1="170" y1="444" x2="348" y2="176" pathLength="1"/>
          <line x1="304" y1="176" x2="482" y2="444" pathLength="1"/><line x1="326" y1="176" x2="504" y2="444" pathLength="1"/><line x1="348" y1="176" x2="526" y2="444" pathLength="1"/>
          <line x1="474" y1="444" x2="652" y2="176" pathLength="1"/><line x1="496" y1="444" x2="674" y2="176" pathLength="1"/><line x1="518" y1="444" x2="696" y2="176" pathLength="1"/>
          <line x1="652" y1="176" x2="830" y2="444" pathLength="1"/><line x1="674" y1="176" x2="852" y2="444" pathLength="1"/><line x1="696" y1="176" x2="874" y2="444" pathLength="1"/>
        </g>`;
      introLogo.before(introBlueprint);
      introBlueprintLines = [...introBlueprint.querySelectorAll(".blueprint-structure line,.blueprint-structure rect")];
      introBlueprintGuides = [...introBlueprint.querySelectorAll(".blueprint-guides circle,.blueprint-guides line")];
      introBlueprintLines.forEach((line) => {
        line.style.strokeDasharray = "1";
        line.style.strokeDashoffset = "1";
      });
      introBlueprintGuides.forEach((guide) => { guide.style.opacity = "0"; });
      const makeLogoWord = (tagName, text) => {
        const word = document.createElement(tagName);
        word.className = "intro-logo-word";
        word.setAttribute("aria-hidden", "true");
        [...text].forEach((character) => {
          const glyph = document.createElement("i");
          glyph.className = "intro-logo-glyph";
          glyph.textContent = character;
          glyph.dataset.glyph = String(introLogoGlyphs.length);
          glyph.dataset.char = character;
          introLogoGlyphs.push(glyph);
          word.append(glyph);
        });
        return word;
      };
      introLogo.replaceChildren(makeLogoWord("span", "NEMO"), makeLogoWord("b", "1ST"));
    }
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
        ink+=backLight*vec3(.025,.12,.16);
        ink+=oil*vec3(.025,.045,.055);
        vec3 color=mix(background,ink,body);
        color+=rim*vec3(.018,.07,.09)*(.28+.72*body);
        color+=vec3((random(gl_FragCoord.xy+time)-.5)/255.);
        color*=smoothstep(0.,.18,reveal);
        gl_FragColor=vec4(color,1.);
      }`;

    const makeScene = (canvas, maxDpr = 1.8) => {
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
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        },
        destroy() { gl.deleteBuffer(buffer); gl.deleteProgram(program); },
      };
    };

    let introScene;
    try {
      introScene = makeScene(introCanvas, innerWidth < 640 ? .72 : .9);
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
    let logoLocked = false;
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    const animateIntroLogo = (progress) => {
      if (!introLogoGlyphs.length) return;
      introBlueprintLines.forEach((line, index) => {
        const drawn = clamp01((progress - index * .008) / .43);
        line.style.strokeDashoffset = String(1 - drawn);
      });
      introBlueprintGuides.forEach((guide, index) => {
        guide.style.opacity = String(clamp01((progress - index * .012) / .24));
      });
      if (introBlueprint) {
        const fade = 1 - clamp01((progress - .68) / .17);
        introBlueprint.style.opacity = String(fade);
        introBlueprint.style.setProperty("--blueprint-scale", String(.94 + clamp01(progress / .6) * .06));
      }
      const origins = [-185,-128,-62,18,88,148,205];
      introLogoGlyphs.forEach((glyph, index) => {
        const start = .2 + index * .025;
        const end = .64 + index * .012;
        const amount = clamp01((progress - start) / (end - start));
        const formed = amount * amount * (3 - 2 * amount);
        const construction = 1 - formed;
        const x = origins[index] * construction;
        const y = (index % 2 ? -138 : 138) * construction;
        const rotation = (index % 2 ? -9 : 9) * construction;
        const skew = (index % 2 ? 24 : -24) * construction;
        const scaleX = .72 + formed * .28;
        const scaleY = 1.62 - formed * .62;
        glyph.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg) scale(${scaleX.toFixed(3)},${scaleY.toFixed(3)})`;
        glyph.style.opacity = String(.08 + formed * .92);
      });
      if (!logoLocked && progress > .72) {
        logoLocked = true;
        introLogo?.classList.add("is-formed");
      }
    };
    let lastIntroDraw = -Infinity;
    const draw = (now) => {
      if (!finished) {
        const progress = Math.min(1, (now - startedAt) / sequenceDuration);
        const activeStage = Math.min(introSteps.length - 1, Math.floor(progress * introSteps.length));
        animateIntroLogo(progress);
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
        const activeStep = introSteps[activeStage];
        if (introActiveName) introActiveName.textContent = progress >= 1 ? "ARCHIVE OPEN" : activeStep?.querySelector("span")?.textContent || "SIGNAL";
        if (introActiveDetail) introActiveDetail.textContent = progress >= 1 ? "all nodes aligned" : activeStep?.querySelector("small")?.textContent || "identity handshake";
        if (introActiveStatus) introActiveStatus.textContent = progress >= 1 ? "ENTER" : "LIVE";
        if (introState) introState.textContent = progress >= 1 ? "ALIGNED" : `PHASE / 0${activeStage + 1}`;
        if (introLog) introLog.textContent = progress >= 1 ? "ALL NODES ALIGNED / Entering archive." : stageLogs[activeStage];
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
