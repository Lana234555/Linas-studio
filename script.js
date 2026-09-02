function toggleLangMenu() {
  document.getElementById("langDropdown").classList.toggle("open");
  document.getElementById("langSwitcher").classList.toggle("open");
}

function selectLang(code, label) {
  document.getElementById("langSelectLabel").textContent = label;
  document.getElementById("langDropdown").classList.remove("open");
  document.getElementById("langSwitcher").classList.remove("open");
  i18n.setLang(code);
}

document.addEventListener("click", function (e) {
  const sw = document.getElementById("langSwitcher");
  if (sw && !sw.contains(e.target)) {
    document.getElementById("langDropdown").classList.remove("open");
    sw.classList.remove("open");
  }
});

function toggleMenu() {
  const m = document.getElementById("mobileMenu");
  const h = document.getElementById("navHamburger");
  m.classList.toggle("open");
  h.classList.toggle("open");
  document.body.style.overflow = m.classList.contains("open") ? "hidden" : "";
}

// Dot grid
const dg = document.getElementById("dotGrid");
if (dg) {
  const cols = 18, rows = 13;
  dg.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  for (let i = 0; i < cols * rows; i++) {
    const s = document.createElement("span");
    dg.appendChild(s);
  }
}

// Nav scroll
const nav = document.getElementById("mainNav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 50);
}, { passive: true });

// Reveal
const revs = document.querySelectorAll(".reveal");
const obs = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add("in"), i * 45);
      obs.unobserve(e.target);
    }
  });
}, { threshold: 0.07 });
revs.forEach((el) => obs.observe(el));

// Pause infinite animations when section is out of viewport
const animTargets = [
  document.querySelector(".hero"),
  ...document.querySelectorAll(".anim-section"),
  ...document.querySelectorAll(".marquee-outer"),
].filter(Boolean);
const animObs = new IntersectionObserver((entries) => {
  entries.forEach((e) => e.target.classList.toggle("in-view", e.isIntersecting));
}, { threshold: 0 });
animTargets.forEach((el) => { el.classList.add("in-view"); animObs.observe(el); });

function filterTeachers(cat, btn) {
  document.querySelectorAll(".ftab").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const cards = document.querySelectorAll(".teacher-card");
  cards.forEach(card => { card.style.opacity = "0"; });
  setTimeout(() => {
    cards.forEach(card => {
      if (cat === "all" || card.dataset.cat === cat) {
        card.classList.remove("hidden");
        card.style.opacity = "1";
      } else {
        card.classList.add("hidden");
        card.style.opacity = "";
      }
    });
  }, 250);
}

function showPricingTab(id, btn, panelSelector) {
  btn.closest(".ptabs").querySelectorAll(".ptab").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(panelSelector).forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  const panel = document.getElementById(id);
  panel.classList.add("active");
  panel.querySelectorAll(".reveal").forEach((el) => {
    el.classList.remove("in");
    setTimeout(() => el.classList.add("in"), 80);
  });
}

function showPricing(id, btn) { showPricingTab(id, btn, ".pricing-panel"); }
function showInstrPricing(id, btn) { showPricingTab(id, btn, ".instr-pricing-panel"); }

const vocalData = {
  vb: { titleSuffix: "pricing.vocal_basic_suffix", sub: "pricing.vocal_basic_sub", trialVal: "120 zł", singleVal: "170 zł", sub4note: "160 zł|pricing.perLesson", sub4val: "640 zł", sub4disc: "pricing.disc6", sub8note: "150 zł|pricing.perLesson", sub8val: "1200 zł", sub8disc: "pricing.disc12" },
  vp: { titleSuffix: "pricing.vocal_pro_suffix", sub: "pricing.vocal_pro_sub", trialVal: "120 zł", singleVal: "200 zł", sub4note: "190 zł|pricing.perLesson", sub4val: "760 zł", sub4disc: "pricing.disc5", sub8note: "180 zł|pricing.perLesson", sub8val: "1440 zł", sub8disc: "pricing.disc10" },
  vt: { titleSuffix: "\u00A0TOP", sub: "pricing.vocal_top_sub", trialVal: "300 zł", singleVal: "400 zł", sub4note: "380 zł|pricing.perLesson", sub4val: "1520 zł", sub4disc: "pricing.disc4", sub8note: "285 zł|pricing.perLesson", sub8val: "2280 zł", sub8disc: "pricing.disc8" }
};
const instrData = {
  ib2: { titleBase: "pricing.instr_basic_title", sub: "pricing.instr_basic_sub", trialVal: "120 zł", singleVal: "170 zł", sub4note: "160 zł|pricing.perLesson", sub4val: "640 zł", sub4disc: "pricing.disc6", sub8note: "150 zł|pricing.perLesson", sub8val: "1200 zł", sub8disc: "pricing.disc12" },
  ip2: { titleBase: "pricing.instr_pro_title", sub: "pricing.instr_pro_sub", trialVal: "120 zł", singleVal: "200 zł", sub4note: "190 zł|pricing.perLesson", sub4val: "760 zł", sub4disc: "pricing.disc5", sub8note: "180 zł|pricing.perLesson", sub8val: "1440 zł", sub8disc: "pricing.disc10" }
};

function updateTabVals(panelId, data) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const vals = panel.querySelectorAll(".tab-val");
  vals.forEach(el => { el.style.opacity = "0"; el.style.transform = "translateY(-5px)"; });
  setTimeout(() => {
    vals.forEach(el => {
      let val = data[el.dataset.tv];
      if (typeof val === "string") {
        if (val.includes("|")) {
          val = val.split("|").map(p => (p.startsWith("pricing.") && window.i18n) ? window.i18n.t(p) : p).join("");
        } else if (val.startsWith("pricing.") && window.i18n) {
          val = window.i18n.t(val);
        }
      }
      el.textContent = val;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  }, 180);
}

let _currentVocalTab = "vb";
let _currentInstrTab = "ib2";

function showVocalTab(id, btn) {
  _currentVocalTab = id;
  btn.closest(".ptabs").querySelectorAll(".ptab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateTabVals("vocal-panel", vocalData[id]);
}
function showInstrTab(id, btn) {
  _currentInstrTab = id;
  btn.closest(".ptabs").querySelectorAll(".ptab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateTabVals("instr-panel", instrData[id]);
}

window.refreshPricingPanels = function () {
  updateTabVals("vocal-panel", vocalData[_currentVocalTab]);
  updateTabVals("instr-panel", instrData[_currentInstrTab]);
};

// Gallery lightbox
(function () {
  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lbImg");
  const lbClose = document.getElementById("lbClose");
  const lbPrev = document.getElementById("lbPrev");
  const lbNext = document.getElementById("lbNext");
  const lbCnt = document.getElementById("lbCounter");
  let items = [];
  let current = 0;

  function init() {
    const allItems = Array.from(document.querySelectorAll(".gallery-item"));
    let pending = allItems.length;
    function onSettle() {
      pending--;
      if (pending > 0) return;
      items = allItems.filter((el) => getComputedStyle(el).display !== "none");
      items.forEach((item, idx) => {
        if (!item.querySelector(".gallery-zoom-icon")) {
          const icon = document.createElement("span");
          icon.className = "gallery-zoom-icon";
          icon.innerHTML = "⤢";
          item.appendChild(icon);
        }
        item.addEventListener("click", () => openLightbox(idx));
      });
    }
    allItems.forEach((item) => {
      const img = item.querySelector("img");
      if (img.dataset.src) {
        onSettle();
        return;
      }
      if (img.complete) {
        if (!img.naturalWidth) item.style.display = "none";
        onSettle();
      } else {
        img.addEventListener("load", () => onSettle());
        img.addEventListener("error", () => { item.style.display = "none"; onSettle(); });
      }
    });
  }

  function getImgSrc(item) { return item.querySelector("img").src; }

  function openLightbox(idx) {
    current = idx;
    lbImg.src = getImgSrc(items[current]);
    lbImg.classList.remove("lb-fade");
    lbCnt.textContent = current + 1 + " / " + items.length;
    lb.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lb.classList.remove("active");
    document.body.style.overflow = "";
  }

  function navigate(dir) {
    lbImg.classList.add("lb-fade");
    setTimeout(() => {
      current = (current + dir + items.length) % items.length;
      lbImg.src = getImgSrc(items[current]);
      lbCnt.textContent = current + 1 + " / " + items.length;
      lbImg.classList.remove("lb-fade");
    }, 200);
  }

  if (lb) {
    lbClose.addEventListener("click", closeLightbox);
    lbPrev.addEventListener("click", () => navigate(-1));
    lbNext.addEventListener("click", () => navigate(1));
    lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("active")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") navigate(-1);
      if (e.key === "ArrowRight") navigate(1);
    });
    let touchStartX = 0;
    lb.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

// Gallery tag filter + "show more" pagination
(function () {
  const buttons = document.querySelectorAll(".gallery-tag");
  let items = Array.from(document.querySelectorAll(".gallery-item"));

  // Shuffle photo order so "Все" mixes all categories together
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  if (items.length) {
    const parent = items[0].parentNode;
    items.forEach((item) => parent.appendChild(item));
  }

  const moreBtn = document.getElementById("galleryMoreBtn");
  const moreWrap = moreBtn ? moreBtn.closest(".gallery-more-wrap") : null;
  if (!buttons.length) return;
  const PAGE_SIZE = window.matchMedia("(max-width: 768px)").matches ? 5 : 8;
  let currentTag = "all";
  let visibleCount = PAGE_SIZE;
  let sectionInView = false;

  function matches(item, tag) {
    return tag === "all" || item.dataset.tag === tag;
  }

  function loadImage(item) {
    const img = item.querySelector("img[data-src]");
    if (!img) return;
    img.src = img.dataset.src;
    img.removeAttribute("data-src");
  }

  function render(animateFrom) {
    const matched = items.filter((item) => matches(item, currentTag));
    let popIdx = 0;
    matched.forEach((item, idx) => {
      const wasHidden = item.classList.contains("is-hidden");
      const show = idx < visibleCount;
      item.classList.toggle("is-hidden", !show);
      if (show && sectionInView) loadImage(item);
      if (show && wasHidden && animateFrom !== undefined && idx >= animateFrom) {
        item.classList.remove("is-popping");
        item.style.animationDelay = (popIdx * 60) + "ms";
        void item.offsetWidth;
        item.classList.add("is-popping");
        popIdx++;
      }
    });
    items.filter((item) => !matches(item, currentTag)).forEach((item) => {
      item.classList.add("is-hidden");
    });
    if (moreWrap) {
      moreWrap.classList.toggle("is-hidden", visibleCount >= matched.length);
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTag = btn.dataset.tag;
      visibleCount = PAGE_SIZE;
      render(0);
    });
  });

  if (moreBtn) {
    moreBtn.addEventListener("click", () => {
      const prevCount = visibleCount;
      visibleCount += PAGE_SIZE;
      render(prevCount);
    });
  }

  render();

  const gallerySection = document.getElementById("gallery");
  if (gallerySection && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          sectionInView = true;
          render();
          observer.disconnect();
        }
      });
    }, { rootMargin: "200px" });
    observer.observe(gallerySection);
  } else {
    sectionInView = true;
    render();
  }
})();

function adjustInstrGrid() {
  const g = document.querySelector(".instr-prices-r");
  if (g) g.style.gridTemplateColumns = window.innerWidth < 768 ? "1fr" : "1fr 1fr";
}
adjustInstrGrid();
window.addEventListener("resize", adjustInstrGrid);

