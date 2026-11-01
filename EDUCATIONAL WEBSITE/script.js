"use strict";

/* ---------------------------------------------------------------
   Shared: mobile nav toggle
---------------------------------------------------------------- */
const navToggle = document.getElementById("nav-toggle");
const siteNav = document.getElementById("site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const open = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!open));
    navToggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    siteNav.classList.toggle("is-open", !open);
  });

  siteNav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    }
  });
}

/* ---------------------------------------------------------------
   Toast helper
---------------------------------------------------------------- */
const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

/* ---------------------------------------------------------------
   Copy citations (with a fallback for local file:// contexts)
---------------------------------------------------------------- */
function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback: hidden textarea + execCommand.
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy") ? resolve() : reject(new Error("copy failed"));
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(ta);
    }
  });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-citation]");
  if (!btn) return;
  copyText(btn.dataset.citation)
    .then(() => showToast("Citation copied to clipboard"))
    .catch(() => showToast("Select and copy manually: " + btn.dataset.citation));
});

/* ---------------------------------------------------------------
   Library search + type filter (home page)
---------------------------------------------------------------- */
const heroForm = document.getElementById("hero-search-form");
const heroInput = document.getElementById("hero-search");
const libInput = document.getElementById("library-search");
const chips = Array.from(document.querySelectorAll(".chip[data-type]"));
const cards = Array.from(document.querySelectorAll(".resource-card"));
const resultCount = document.getElementById("result-count");
const emptyState = document.getElementById("empty-state");

let activeType = "all";

function applyLibraryFilter() {
  if (!libInput || !resultCount || !emptyState) return;
  const query = libInput.value.trim().toLowerCase();
  let visible = 0;

  cards.forEach((card) => {
    const type = card.dataset.type;
    const text = card.textContent.toLowerCase();
    const matchesType = activeType === "all" || type === activeType;
    const matchesQuery = !query || text.includes(query);
    const show = matchesType && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });

  resultCount.textContent = String(visible);
  emptyState.hidden = visible > 0;
}

if (heroInput && libInput) {
  function syncInputs(source) {
    const value = source.value;
    if (source !== heroInput) heroInput.value = value;
    if (source !== libInput) libInput.value = value;
    applyLibraryFilter();
  }
  heroInput.addEventListener("input", () => syncInputs(heroInput));
  libInput.addEventListener("input", () => syncInputs(libInput));
}

if (heroForm && heroInput) {
  heroForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const target = document.getElementById("library");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => {
      c.classList.toggle("is-active", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    activeType = chip.dataset.type;
    applyLibraryFilter();
  });
});

/* ---------------------------------------------------------------
   Topic filter (Types of Crime page)
---------------------------------------------------------------- */
const topicSearch = document.getElementById("topic-search");
const topicCards = Array.from(document.querySelectorAll(".topic-card"));
const topicEmpty = document.getElementById("topic-empty");
const topicChips = Array.from(document.querySelectorAll(".chip[data-topic]"));
let activeTopic = "all";

function applyTopicFilter() {
  const query = topicSearch ? topicSearch.value.trim().toLowerCase() : "";
  let visible = 0;

  topicCards.forEach((card) => {
    const type = card.dataset.type;
    const text = card.textContent.toLowerCase();
    const matchesType = activeTopic === "all" || type === activeTopic;
    const matchesQuery = !query || text.includes(query);
    const show = matchesType && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });

  if (topicEmpty) topicEmpty.hidden = visible > 0;
}

if (topicSearch) topicSearch.addEventListener("input", applyTopicFilter);
topicChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    topicChips.forEach((c) => {
      c.classList.toggle("is-active", c === chip);
      c.setAttribute("aria-pressed", String(c === chip));
    });
    activeTopic = chip.dataset.topic;
    applyTopicFilter();
  });
});

/* ---------------------------------------------------------------
   Contribute form (demo only — no backend)
---------------------------------------------------------------- */
const contributeForm = document.getElementById("contribute-form");
const formNote = document.getElementById("form-note");
if (contributeForm && formNote) {
  contributeForm.addEventListener("submit", (e) => {
    e.preventDefault();
    formNote.hidden = false;
    const input = contributeForm.querySelector("input");
    if (input) input.value = "";
  });
}

/* ---------------------------------------------------------------
   Hero record "Copy APA" (home page)
---------------------------------------------------------------- */
const heroCiteBtn = document.querySelector("[data-cite-target='hero']");
if (heroCiteBtn) {
  heroCiteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    copyText("National Bureau of Statistics. (2024). Crime experience and security survey. Nigerian Statistical Publishing.")
      .then(() => showToast("Citation copied to clipboard"))
      .catch(() => showToast("Select and copy manually"));
  });
}

/* ---------------------------------------------------------------
   Resource blog pop-ups
---------------------------------------------------------------- */
const blogDialog = document.getElementById("blog-dialog");
const blogDialogContent = document.getElementById("blog-dialog-content");
const blogButtons = document.querySelectorAll("[data-blog]");

if (blogDialog && blogDialogContent && blogButtons.length) {
  const closeBlogDialog = () => blogDialog.close();

  blogButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const template = document.getElementById("blog-" + button.dataset.blog);
      if (!template) return;
      blogDialogContent.replaceChildren(template.content.cloneNode(true));
      const title = blogDialogContent.querySelector("h2");
      if (title) title.id = "blog-dialog-title";
      blogDialog.showModal();
    });
  });

  blogDialog.querySelector(".blog-dialog-close").addEventListener("click", closeBlogDialog);
  blogDialog.addEventListener("click", (event) => {
    if (event.target === blogDialog) closeBlogDialog();
  });
}

/* ---------------------------------------------------------------
   Topic guide pop-ups (Types of Crime page)
---------------------------------------------------------------- */
const topicDialog = document.getElementById("topic-dialog");
const topicDialogContent = document.getElementById("topic-dialog-content");
const topicArticleButtons = document.querySelectorAll("[data-topic-article]");

if (topicDialog && topicDialogContent && topicArticleButtons.length) {
  const closeTopicDialog = () => topicDialog.close();

  topicArticleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const template = document.getElementById("topic-" + button.dataset.topicArticle);
      if (!template) return;
      topicDialogContent.replaceChildren(template.content.cloneNode(true));
      const title = topicDialogContent.querySelector("h2");
      if (title) title.id = "topic-dialog-title";
      topicDialog.showModal();
    });
  });

  topicDialog.querySelector(".blog-dialog-close").addEventListener("click", closeTopicDialog);
  topicDialog.addEventListener("click", (event) => {
    if (event.target === topicDialog) closeTopicDialog();
  });
}

/* ---------------------------------------------------------------
   Footer year
---------------------------------------------------------------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

/* ---------------------------------------------------------------
   Reveal on scroll (respects reduced motion)
---------------------------------------------------------------- */
const revealEls = document.querySelectorAll(
  ".section-head, .audience-card, .resource-card, .ethics-col, .steps li, .record, .float-tag, .card, .topic-card, .split > *"
);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealEls.forEach((el) => el.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => {
    el.classList.add("reveal");
    observer.observe(el);
  });
}

/* ---------------------------------------------------------------
   Parallax backgrounds (mobile-friendly, respects reduced motion)
---------------------------------------------------------------- */
const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));

if (parallaxEls.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let parallaxTicking = false;

  function updateParallax() {
    const vh = window.innerHeight;
    parallaxEls.forEach((el) => {
      const host = el.parentElement;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const speed = parseFloat(el.dataset.speed || "0.35");
      const centerOffset = rect.top + rect.height / 2 - vh / 2;
      let shift = centerOffset * speed;
      const max = host.offsetHeight * 0.3; // matches the 30% overscan in CSS
      shift = Math.max(-max, Math.min(max, shift));
      el.style.transform = "translate3d(0, " + shift.toFixed(2) + "px, 0)";
    });
    parallaxTicking = false;
  }

  function requestParallaxTick() {
    if (!parallaxTicking) {
      parallaxTicking = true;
      window.requestAnimationFrame(updateParallax);
    }
  }

  window.addEventListener("scroll", requestParallaxTick, { passive: true });
  window.addEventListener("resize", requestParallaxTick);
  updateParallax();
}
