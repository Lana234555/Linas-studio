// ── EVENTS BOARD + OPENING BANNER ──
// Reads window.SITE_CONTENT.events (edited through /admin/, tab «Події»).
// Each event decides by itself when it is on the site: it appears at publishFrom
// (or right away) and disappears at publishUntil (or when the event is over).
// Events marked "banner" also open as a big banner when someone opens the site.
// All dates are Warsaw time. Runs after content-render.js and before script.js.
(function () {
  const C = window.SITE_CONTENT;
  if (!C) return;
  const LANGS = ["ru", "en", "pl"];
  const ALL = LANGS.concat("be");
  const TZ = "Europe/Warsaw";
  const LOCALE = { ru: "ru-RU", en: "en-GB", pl: "pl-PL", be: "ru-RU" };
  const ENROLL_DEFAULT = "https://app.band-space.com/user/search/warszawa/linas_music_studio/tutors";
  const tr = {};
  ALL.forEach((l) => (tr[l] = { content: { ev: {} } }));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|#|mailto:|tel:|photo\/|data:image\/)/i.test(u) ? u : "#";
  }
  // Register a string in every language (missing ones fall back to Russian)
  function put(path, byLang) {
    ALL.forEach((l) => {
      const val = (byLang && (byLang[l] || byLang.ru)) || "";
      const parts = path.split(".");
      let o = tr[l].content.ev;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
      o[parts[parts.length - 1]] = val;
    });
    return "content.ev." + path;
  }
  function span(path, byLang, cls) {
    const ru = (byLang && byLang.ru) || "";
    return `<span${cls ? ` class="${cls}"` : ""} data-i18n="${put(path, byLang)}">${esc(ru)}</span>`;
  }

  // "2026-12-14T19:00" in Warsaw time -> timestamp
  function warsawTime(str) {
    if (!str) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(str);
    if (!m) return NaN;
    const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    // offset of Warsaw from UTC at that moment
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(asUtc));
    const p = {};
    parts.forEach((x) => (p[x.type] = x.value));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    return asUtc - (shown - asUtc);
  }
  function endOfDay(str) {
    return str ? warsawTime(str.slice(0, 10) + "T23:59") + 59000 : NaN;
  }
  function eventEnd(e) {
    if (e.endDate) return warsawTime(e.endDate);
    return endOfDay(e.date);
  }
  function isLive(e, now) {
    if (!e || e.hidden || !e.date) return false;
    const from = e.publishFrom ? warsawTime(e.publishFrom) : -Infinity;
    const until = e.publishUntil ? warsawTime(e.publishUntil) : eventEnd(e);
    return now >= from && now < until;
  }
  function fmt(ts, lang, opts) {
    try {
      return new Intl.DateTimeFormat(LOCALE[lang] || "ru-RU", Object.assign({ timeZone: TZ }, opts)).format(new Date(ts));
    } catch (e) {
      return "";
    }
  }
  function cap(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
  function hasTime(str) {
    return /T\d{2}:\d{2}/.test(str || "") && !/T00:00/.test(str);
  }
  // Date strings for every language
  function dateParts(e) {
    const start = warsawTime(e.date);
    const end = e.endDate ? warsawTime(e.endDate) : NaN;
    const sameDay = !isNaN(end) && fmt(start, "en", { dateStyle: "short" }) === fmt(end, "en", { dateStyle: "short" });
    const out = { day: {}, month: {}, wd: {}, line: {} };
    ALL.forEach((l) => {
      out.day[l] = fmt(start, l, { day: "numeric" });
      out.month[l] = fmt(start, l, { month: "short" }).replace(".", "");
      out.wd[l] = cap(fmt(start, l, { weekday: "short" }));
      const hm = (ts) => fmt(ts, l, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      let line;
      if (!isNaN(end) && !sameDay) {
        // several days: "17 января — 18 января, с 11:00"
        line = fmt(start, l, { day: "numeric", month: "long" }) + " — " + fmt(end, l, { day: "numeric", month: "long" });
        if (hasTime(e.date)) line += ", " + hm(start);
      } else {
        line = cap(fmt(start, l, { weekday: "long", day: "numeric", month: "long" }));
        if (hasTime(e.date)) line += ", " + hm(start);
        if (!isNaN(end)) line += "–" + hm(end);
      }
      out.line[l] = line;
    });
    return out;
  }

  const UI = {
    chip: { ru: "Афиша", en: "Events", pl: "Wydarzenia" },
    title: { ru: "Ближайшие <em>события</em>", en: "Upcoming <em>events</em>", pl: "Najbliższe <em>wydarzenia</em>" },
    nav: { ru: "Афиша", en: "Events", pl: "Wydarzenia" },
    btn: { ru: "Подробнее", en: "Learn more", pl: "Szczegóły" },
    main: { ru: "Главное событие", en: "Don't miss it", pl: "Nie przegap" },
    soon: { ru: "Скоро", en: "Soon", pl: "Wkrótce" },
    ribbon: { ru: "Ближайшее событие:", en: "Next event:", pl: "Najbliższe wydarzenie:" },
    all: { ru: "Все события", en: "All events", pl: "Wszystkie wydarzenia" },
    close: { ru: "Закрыть", en: "Close", pl: "Zamknij" },
  };

  const now = Date.now();
  const live = (C.events || [])
    .filter((e) => isLive(e, now))
    // main (banner) events first, then the rest; each group by date
    .sort((a, b) => (b.banner ? 1 : 0) - (a.banner ? 1 : 0) || warsawTime(a.date) - warsawTime(b.date));

  const board = document.getElementById("afisha");
  const navLinks = document.querySelectorAll('[data-afisha-link]');
  if (!live.length) {
    if (board) board.hidden = true;
    navLinks.forEach((a) => (a.hidden = true));
    return;
  }
  navLinks.forEach((a) => (a.hidden = false));
  put("ui.nav", UI.nav);

  function info(e, k) {
    const t = e.text || {};
    const by = {};
    LANGS.forEach((l) => (by[l] = (t[l] && t[l][k]) || ""));
    return by;
  }
  function eventBits(e, key) {
    const d = dateParts(e);
    const btnText = info(e, "button");
    if (!btnText.ru) Object.assign(btnText, UI.btn);
    return {
      d,
      key,
      title: info(e, "title"),
      place: info(e, "place"),
      desc: info(e, "desc"),
      btnText,
      url: esc(safeUrl(e.buttonUrl || ENROLL_DEFAULT)),
      img: e.image ? esc(safeUrl(e.image)) : "",
    };
  }

  // ── board ──
  if (board) {
    board.hidden = false;
    const grid = board.querySelector("[data-content='events']");
    board.querySelector("[data-afisha='chip']").setAttribute("data-i18n", put("ui.chip", UI.chip));
    const tEl = board.querySelector("[data-afisha='title']");
    put("ui.title", UI.title);
    tEl.removeAttribute("data-i18n");
    tEl.setAttribute("data-i18n-html", "content.ev.ui.title");
    tEl.innerHTML = UI.title.ru;
    grid.classList.toggle("afisha-one", live.length === 1);
    grid.innerHTML = live
      .map((e, i) => {
        const b = eventBits(e, "e" + i);
        return `
        <article class="afisha-card reveal${e.banner ? " is-main" : ""}">
          <div class="afisha-img">
            ${b.img ? `<img src="${b.img}" alt="" loading="lazy" />` : `<div class="afisha-img-ph">🎤</div>`}
            <div class="afisha-date">
              <span class="afisha-day" data-i18n="${put(b.key + ".day", b.d.day)}">${esc(b.d.day.ru)}</span>
              <span class="afisha-mon" data-i18n="${put(b.key + ".mon", b.d.month)}">${esc(b.d.month.ru)}</span>
              <span class="afisha-wd" data-i18n="${put(b.key + ".wd", b.d.wd)}">${esc(b.d.wd.ru)}</span>
            </div>
            ${e.banner ? `<div class="afisha-flag">★ ${span("ui.main", UI.main)}</div>` : ""}
          </div>
          <div class="afisha-body">
            <h3 class="afisha-title" data-i18n="${put(b.key + ".title", b.title)}">${esc(b.title.ru)}</h3>
            <div class="afisha-meta">
              <div>🗓 ${span(b.key + ".line", b.d.line)}</div>
              ${b.place.ru ? `<div>📍 ${span(b.key + ".place", b.place)}</div>` : ""}
            </div>
            ${b.desc.ru ? `<p class="afisha-desc" data-i18n="${put(b.key + ".desc", b.desc)}">${esc(b.desc.ru)}</p>` : ""}
            <a class="afisha-btn" href="${b.url}" target="_blank" rel="noopener"><span data-i18n="${put(b.key + ".btn", b.btnText)}">${esc(b.btnText.ru)}</span><span>→</span></a>
          </div>
        </article>`;
      })
      .join("");
  }

  // ── opening banner + top ribbon ──
  const main = live.filter((e) => e.banner);
  if (main.length) {
    const slides = main
      .map((e, i) => {
        const b = eventBits(e, "e" + live.indexOf(e));
        return `
        <div class="evb-slide${i === 0 ? " active" : ""}">
          <div class="evb-img">${b.img ? `<img src="${b.img}" alt="" />` : `<div class="afisha-img-ph">🎤</div>`}</div>
          <div class="evb-body">
            <div class="evb-flag">★ ${span("ui.main", UI.main)}</div>
            <h2 class="evb-title" data-i18n="content.ev.${b.key}.title">${esc(b.title.ru)}</h2>
            <div class="evb-date">🗓 <span data-i18n="content.ev.${b.key}.line">${esc(b.d.line.ru)}</span></div>
            ${b.place.ru ? `<div class="evb-place">📍 <span data-i18n="content.ev.${b.key}.place">${esc(b.place.ru)}</span></div>` : ""}
            ${b.desc.ru ? `<p class="evb-desc" data-i18n="content.ev.${b.key}.desc">${esc(b.desc.ru)}</p>` : ""}
            <div class="evb-actions">
              <a class="evb-btn" href="${b.url}" target="_blank" rel="noopener"><span data-i18n="content.ev.${b.key}.btn">${esc(b.btnText.ru)}</span><span>→</span></a>
              ${board ? `<a class="evb-all" href="#afisha" data-evb-close>${span("ui.all", UI.all)}</a>` : ""}
            </div>
          </div>
        </div>`;
      })
      .join("");
    // Navigation sits outside the card: arrows on the sides, dots underneath
    const multi = main.length > 1;
    const arrows = multi
      ? `<button class="evb-arrow evb-prev" data-evb-step="-1" aria-label="‹">‹</button><button class="evb-arrow evb-next" data-evb-step="1" aria-label="›">›</button>`
      : "";
    const dots = multi
      ? `<div class="evb-dots">${main.map((_, i) => `<button class="evb-dot${i === 0 ? " active" : ""}" data-evb-go="${i}" aria-label="${i + 1}"></button>`).join("")}</div>`
      : "";
    const closeKey = put("ui.close", UI.close);
    const modal = document.createElement("div");
    modal.className = "evb";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="evb-wrap">
        <div class="evb-box" role="dialog" aria-modal="true">
          <button class="evb-x" data-evb-close aria-label="${esc(UI.close.ru)}" data-i18n-aria="${closeKey}">✕</button>
          ${slides}
        </div>
        ${arrows}
        ${dots}
      </div>`;
    document.body.appendChild(modal);

    const first = main[0];
    const fb = eventBits(first, "e" + live.indexOf(first));
    const ribbon = document.createElement("div");
    ribbon.className = "evr";
    ribbon.innerHTML = `
      <button class="evr-open" type="button">
        <span class="evr-star">★</span>
        ${span("ui.ribbon", UI.ribbon, "evr-lead")}
        <b data-i18n="content.ev.${fb.key}.title">${esc(fb.title.ru)}</b>
        <span class="evr-date" data-i18n="content.ev.${fb.key}.line">${esc(fb.d.line.ru)}</span>
        <span class="evr-arrow">→</span>
      </button>
      <button class="evr-x" type="button" aria-label="${esc(UI.close.ru)}">✕</button>`;
    document.body.prepend(ribbon);
    document.body.classList.add("has-evr");

    let cur = 0;
    function go(n) {
      const s = modal.querySelectorAll(".evb-slide");
      cur = (n + s.length) % s.length;
      s.forEach((x, i) => x.classList.toggle("active", i === cur));
      modal.querySelectorAll(".evb-dot").forEach((x, i) => x.classList.toggle("active", i === cur));
    }
    let timer = null;
    function open() {
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add("show"));
      document.documentElement.style.overflow = "hidden";
      clearInterval(timer);
      if (main.length > 1) timer = setInterval(() => go(cur + 1), 7000);
    }
    function close() {
      modal.classList.remove("show");
      document.documentElement.style.overflow = "";
      clearInterval(timer);
      setTimeout(() => (modal.hidden = true), 250);
      try {
        sessionStorage.setItem("evbSeen", seenId);
      } catch (e) {}
    }
    modal.addEventListener("click", (ev) => {
      if (ev.target === modal || ev.target.closest("[data-evb-close]")) close();
      const step = ev.target.closest("[data-evb-step]");
      if (step) { clearInterval(timer); go(cur + Number(step.dataset.evbStep)); }
      const dot = ev.target.closest("[data-evb-go]");
      if (dot) { clearInterval(timer); go(Number(dot.dataset.evbGo)); }
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !modal.hidden) close();
    });
    ribbon.querySelector(".evr-open").addEventListener("click", open);
    ribbon.querySelector(".evr-x").addEventListener("click", () => {
      ribbon.remove();
      document.body.classList.remove("has-evr");
    });

    // Show once per visit (a new banner event shows again)
    const seenId = main.map((e) => e.id).join(",");
    let seen = "";
    try {
      seen = sessionStorage.getItem("evbSeen") || "";
    } catch (e) {}
    if (seen !== seenId || /[?&]preview=1\b/.test(location.search)) setTimeout(open, 900);
  }

  if (window.i18n && window.i18n.addTranslations) window.i18n.addTranslations(tr);
})();
