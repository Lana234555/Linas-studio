function toggleMenu() {
  const m = document.getElementById("mobileMenu");
  const h = document.getElementById("navHamburger");
  m.classList.toggle("open");
  h.classList.toggle("open");
  document.body.style.overflow = m.classList.contains("open") ? "hidden" : "";
}

function enrollTeacher(val) {
  const sel = document.getElementById("directionSelect");
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === val || sel.options[i].text === val) {
        sel.selectedIndex = i;
        break;
      }
    }
  }
  const contact = document.getElementById("contact");
  if (contact) contact.scrollIntoView({ behavior: "smooth", block: "start" });
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
  vb: { titleSuffix: " / Фортепиано", sub: "Преподаватели Basic · начинающий и средний уровень, дети и взрослые", trialVal: "120 zł", singleVal: "170 zł", sub4note: "160 zł / урок", sub4val: "640 zł", sub4disc: "−6% от разового", sub8note: "150 zł / урок", sub8val: "1200 zł", sub8disc: "−12% от разового" },
  vp: { titleSuffix: " / Фортепиано\u00A0PRO", sub: "Катерина Корниюк · расширенный репертуар техник, PRO-уровень", trialVal: "120 zł", singleVal: "200 zł", sub4note: "190 zł / урок", sub4val: "760 zł", sub4disc: "−5% от разового", sub8note: "180 zł / урок", sub8val: "1440 zł", sub8disc: "−10% от разового" },
  vt: { titleSuffix: "\u00A0TOP", sub: "Лина Поверга · продолжающий и профессиональный уровень, подростки и взрослые", trialVal: "200 zł", singleVal: "250 zł", sub4note: "240 zł / урок", sub4val: "960 zł", sub4disc: "−4% от разового", sub8note: "230 zł / урок", sub8val: "1840 zł", sub8disc: "−8% от разового" }
};
const instrData = {
  ib2: { titleSuffix: "", sub: "Сергей Панасенко, Евгений Велько · начинающий и продолжающий уровень", trialVal: "120 zł", singleVal: "170 zł", sub4note: "160 zł / урок", sub4val: "640 zł", sub4disc: "−6% от разового", sub8note: "150 zł / урок", sub8val: "1200 zł", sub8disc: "−12% от разового" },
  ip2: { titleSuffix: "\u00A0PRO", sub: "Катерина Корниюк · продолжающий и профессиональный уровень", trialVal: "120 zł", singleVal: "200 zł", sub4note: "190 zł / урок", sub4val: "760 zł", sub4disc: "−5% от разового", sub8note: "180 zł / урок", sub8val: "1440 zł", sub8disc: "−10% от разового" }
};

function updateTabVals(panelId, data) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const vals = panel.querySelectorAll(".tab-val");
  vals.forEach(el => { el.style.opacity = "0"; el.style.transform = "translateY(-5px)"; });
  setTimeout(() => {
    vals.forEach(el => { el.textContent = data[el.dataset.tv]; el.style.opacity = "1"; el.style.transform = "translateY(0)"; });
  }, 180);
}

function showVocalTab(id, btn) {
  btn.closest(".ptabs").querySelectorAll(".ptab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateTabVals("vocal-panel", vocalData[id]);
}
function showInstrTab(id, btn) {
  btn.closest(".ptabs").querySelectorAll(".ptab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  updateTabVals("instr-panel", instrData[id]);
}

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
      items = allItems.filter((el) => el.style.display !== "none");
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

function adjustInstrGrid() {
  const g = document.querySelector(".instr-prices-r");
  if (g) g.style.gridTemplateColumns = window.innerWidth < 768 ? "1fr" : "1fr 1fr";
}
adjustInstrGrid();
window.addEventListener("resize", adjustInstrGrid);

// Form submission
const RATE_LIMIT_KEY = "lms_submit_times";
const RATE_LIMIT_MAX = 3;       // max submissions
const RATE_LIMIT_WINDOW = 10 * 60 * 1000; // per 10 minutes

function checkRateLimit() {
  const now = Date.now();
  let times = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || "[]");
  times = times.filter(t => now - t < RATE_LIMIT_WINDOW);
  if (times.length >= RATE_LIMIT_MAX) return false;
  times.push(now);
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(times));
  return true;
}

document.getElementById("submitBtn").addEventListener("click", function () {
  // Honeypot check — bots fill hidden field, humans leave it empty
  const honeypot = document.getElementById("websiteField");
  if (honeypot && honeypot.value.trim() !== "") return;

  const nameField = document.getElementById("nameField");
  const phoneField = document.getElementById("phoneField");
  const emailField = document.getElementById("emailField");

  if (!nameField.value.trim()) {
    alert(window.i18n ? window.i18n.t("validation.nameRequired") : "Пожалуйста, введите имя");
    nameField.focus();
    return;
  }
  if (!phoneField.value.trim()) {
    alert(window.i18n ? window.i18n.t("validation.phoneRequired") : "Пожалуйста, введите телефон");
    phoneField.focus();
    return;
  }
  if (!emailField.value.trim()) {
    alert(window.i18n ? window.i18n.t("validation.emailRequired") : "Пожалуйста, введите email");
    emailField.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailField.value.trim())) {
    alert(window.i18n ? window.i18n.t("validation.emailInvalid") : "Пожалуйста, введите корректный email");
    emailField.focus();
    return;
  }

  // Rate limit check
  if (!checkRateLimit()) {
    alert("Ви надіслали забагато заявок. Спробуйте через 10 хвилин.");
    return;
  }

  const SHEET_URL = (window.APP_CONFIG && window.APP_CONFIG.sheetUrl)
    || "https://linas-music-prox.darienkosvetlana338.workers.dev";
  const formToken = (window.APP_CONFIG && window.APP_CONFIG.formToken)
    || "LMS-2025-SECRET";

  const payload = {
    token: formToken,
    name: nameField.value.trim(),
    phone: phoneField.value.trim(),
    email: emailField.value.trim(),
    instrument: (document.getElementById("directionSelect") || {}).value || "",
    comment: (document.getElementById("messageField") || {}).value || ""
  };

  fetch(SHEET_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  }).catch(() => {});

  showSuccessMessage();
});

function showSuccessMessage() {
  const t = (k, fb) => window.i18n ? window.i18n.t(k) : fb;
  const modal = document.createElement("div");
  modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:10000;backdrop-filter:blur(8px);";
  const modalContent = document.createElement("div");
  modalContent.style.cssText = "background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:40px 32px;max-width:500px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5);";
  modalContent.innerHTML = `
    <div style="font-size:3rem;margin-bottom:20px">🎉</div>
    <h3 style="font-family:'Alice',serif;font-size:1.8rem;color:var(--white);margin-bottom:16px;line-height:1.3">${t("modal.title", "Спасибо за заявку!")}</h3>
    <p style="color:var(--text);line-height:1.6;margin-bottom:24px;font-size:1rem">${t("modal.body", "Мы обязательно ответим Вам в рабочее время.")}</p>
    <a href="https://www.instagram.com/linas_music_studio?igsh=MWpycjZiZ3Awdnp3Mw==" target="_blank" class="btn-pill btn-teal" style="display:inline-flex;align-items:center;gap:8px;text-decoration:none">
      <span>📸</span><span>${t("modal.igBtn", "Перейти в Instagram")}</span>
    </a>
  `;
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
  document.addEventListener("keydown", function closeOnEscape(e) {
    if (e.key === "Escape") { modal.remove(); document.removeEventListener("keydown", closeOnEscape); }
  });
}
