/* Applies one supplied image per page and moves it subtly as the page scrolls. */
(() => {
  const images = [
    "background-justice-gavel.webp",
    "background-justice-handcuffs.jpg",
    "background-crime-law.webp",
  ];
  const pageName = location.pathname.split("/").pop() || "index.html";
  const imageIndex = Array.from(pageName).reduce((total, character) => total + character.charCodeAt(0), 0) % images.length;
  document.documentElement.style.setProperty("--site-bg-image", `url("${images[imageIndex]}")`);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const update = () => {
    const offset = Math.max(-96, Math.min(96, window.scrollY * -0.08));
    document.documentElement.style.setProperty("--site-bg-offset", `${offset.toFixed(1)}px`);
    ticking = false;
  };
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  update();
})();
