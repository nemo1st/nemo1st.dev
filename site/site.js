(() => {
  const root = document.documentElement;
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
    const originals = new Map(items.map((item) => {
      const target = item.querySelector("[data-interview-text]");
      return [item, target?.textContent || ""];
    }));
    let cancelled = false;
    const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    const showAll = () => {
      cancelled = true;
      items.forEach((item) => {
        item.hidden = false;
        const target = item.querySelector("[data-interview-text]");
        if (target) target.textContent = originals.get(item);
      });
      ending.hidden = false;
      skip.hidden = true;
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
    } else {
      items.forEach((item) => { item.hidden = true; });
      ending.hidden = true;
      skip.addEventListener("click", showAll);
      (async () => {
        for (const item of items) {
          if (cancelled) return;
          item.hidden = false;
          const target = item.querySelector("[data-interview-text]");
          if (target) {
            const full = originals.get(item);
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
