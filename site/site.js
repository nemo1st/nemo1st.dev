(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector("[data-theme-toggle]");
  const menuButton = document.querySelector("[data-menu-toggle]");
  const nav = document.querySelector("[data-site-nav]");

  const preferredDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
  const currentTheme = () => localStorage.getItem("nemo-theme") || "system";
  const applyTheme = (theme) => {
    root.classList.toggle("dark", theme === "dark" || (theme === "system" && preferredDark()));
    if (themeButton) themeButton.textContent = theme === "light" ? "light" : theme === "dark" ? "dark" : "system";
  };

  applyTheme(currentTheme());
  themeButton?.addEventListener("click", () => {
    const themes = ["system", "light", "dark"];
    const next = themes[(themes.indexOf(currentTheme()) + 1) % themes.length];
    localStorage.setItem("nemo-theme", next);
    applyTheme(next);
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (currentTheme() === "system") applyTheme("system");
  });

  menuButton?.addEventListener("click", () => {
    const open = nav?.toggleAttribute("data-open");
    menuButton.setAttribute("aria-expanded", String(Boolean(open)));
  });
})();
