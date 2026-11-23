// ── RENDER CONTENT FROM content.js ──
// Draws teacher cards, kids prices and the photo gallery from window.SITE_CONTENT
// (edited through /admin/). Runs before script.js so reveal animations, the gallery
// filter and the lightbox see the rendered elements.
(function () {
  // /?preview=1 shows the unpublished draft saved by the admin page in this browser
  try {
    if (/[?&]preview=1\b/.test(location.search)) {
      const draft = JSON.parse(localStorage.getItem("linaAdminPreview") || "null");
      if (draft) {
        window.SITE_CONTENT = draft;
        const bar = document.createElement("div");
        bar.textContent = "Попередній перегляд: ці зміни ще не опубліковані";
        bar.style.cssText = "position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:2000;background:#00c4b3;color:#041311;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.4)";
        document.body.appendChild(bar);
      }
    }
  } catch (e) {}
  const C = window.SITE_CONTENT;
  if (!C) return;
  const LANGS = ["ru", "en", "pl"];
  const tr = {};
  LANGS.concat("be").forEach((l) => (tr[l] = { content: { t: {}, g: {}, p: {}, disc: {} } }));

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function safeUrl(u) {
    u = String(u || "").trim();
    return /^(https?:\/\/|#|mailto:|tel:|photo\/)/i.test(u) ? u : "#";
  }
  // Register a string in every language. Missing languages fall back to Russian.
  function put(path, byLang) {
    LANGS.concat("be").forEach((l) => {
      const val = (byLang && (byLang[l] || byLang.ru)) || "";
      const parts = path.split(".");
      let o = tr[l].content;
      for (let i = 0; i < parts.length - 1; i++) o = o[parts[i]] = o[parts[i]] || {};
      o[parts[parts.length - 1]] = val;
    });
    return "content." + path;
  }
  function textOf(t, field) {
    const out = {};
    LANGS.forEach((l) => (out[l] = (t.text && t.text[l] && t.text[l][field]) || ""));
    return out;
  }

  const ENROLL_DEFAULT = "https://app.band-space.com/user/search/warszawa/linas_music_studio/tutors";
  const LEVEL_LABEL = { basic: "Basic", pro: "Pro", top: "Top" };

  function commonParts(t, key) {
    const tags = (t.tags || [])
      .map((tag, i) => `<span class="tc-tag" data-i18n="${put(key + ".tags." + i, tag)}">${esc(tag.ru)}</span>`)
      .join("");
    const videos = (t.videos || [])
      .filter((v) => v && v.url)
      .map((v, i) => {
        const lab = {};
        LANGS.forEach((l) => (lab[l] = "▶︎ " + ((v.label && (v.label[l] || v.label.ru)) || "Видео")));
        return `<a href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener" class="vlink" data-i18n="${put(key + ".videos." + i, lab)}">${esc(lab.ru)}</a>`;
      })
      .join("");
    const ru = (t.text && t.text.ru) || {};
    return {
      name: `<div class="tc-name" data-i18n="${put(key + ".name", textOf(t, "name"))}">${esc(ru.name)}</div>`,
      role: `<div class="tc-role" data-i18n="${put(key + ".role", textOf(t, "role"))}">${esc(ru.role)}</div>`,
      bio: `<p class="tc-bio" data-i18n="${put(key + ".bio", textOf(t, "bio"))}">${esc(ru.bio)}</p>`,
      level: ru.level
        ? `<p style="font-size:0.74rem;color:var(--muted);margin-bottom:12px" data-i18n="${put(key + ".level", textOf(t, "level"))}">${esc(ru.level)}</p>`
        : "",
      langs: ru.langs
        ? `<strong data-i18n="teachers.langs">Языки:</strong> <span data-i18n="${put(key + ".langs", textOf(t, "langs"))}">${esc(ru.langs)}</span>`
        : "",
      tags,
      videos,
      enroll: esc(safeUrl(t.enrollUrl || ENROLL_DEFAULT)),
      photo: esc(safeUrl(t.photo)),
      alt: esc(ru.name),
      emoji: esc(t.emoji || "🎵"),
      badge: LEVEL_LABEL[t.level] || "Basic",
    };
  }

  function vocalCard(t, key) {
    const p = commonParts(t, key);
    let badgeAttr = "";
    if (t.level === "top") badgeAttr = ' style="background: rgba(255, 215, 0, 0.9); color: #111"';
    const badgeClass = t.level === "pro" ? "tc-cat-badge badge-pro" : "tc-cat-badge";
    return `
      <div class="teacher-card reveal" data-cat="${esc(t.level || "basic")}">
        <div class="tc-img">
          ${t.photo ? `<img src="${p.photo}" alt="${p.alt}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display=''" />` : ""}
          <div class="tc-img-ph"${t.photo ? ' style="display: none"' : ""}>${p.emoji}</div>
          <div class="${badgeClass}"${badgeAttr}>${p.badge}</div>
        </div>
        <div class="tc-body">
          ${p.role}${p.name}${p.bio}
          ${p.tags ? `<div class="tc-tags">${p.tags}</div>` : ""}
          ${p.level}
          ${p.langs ? `<div class="tc-langs">${p.langs}</div>` : ""}
          ${p.videos ? `<div class="tc-links">${p.videos}</div>` : ""}
          <a class="tc-enroll-btn" href="${p.enroll}" target="_blank" rel="noopener">
            <span data-i18n="teachers.enrollBtn">Записаться к этому педагогу</span><span class="tc-enroll-btn-arrow">→</span>
          </a>
        </div>
      </div>`;
  }

  function instrCard(t, key) {
    const p = commonParts(t, key);
    let badgeAttr = "";
    if (t.level === "pro") badgeAttr = ' style="background: rgba(147, 51, 234, 0.88); color: #fff"';
    if (t.level === "top") badgeAttr = ' style="background: rgba(255, 215, 0, 0.9); color: #111"';
    return `
      <div class="instr-single-card reveal">
        <div class="instr-single-img">
          ${t.photo ? `<img src="${p.photo}" alt="${p.alt}" loading="lazy" />` : ""}
          <div class="instr-single-img-ph">${p.emoji}</div>
          <div class="instr-single-badge"${badgeAttr}>${p.badge}</div>
        </div>
        <div class="instr-single-body">
          ${p.role}${p.name}${p.bio}
          ${p.tags ? `<div class="tc-tags" style="margin-bottom: 16px">${p.tags}</div>` : ""}
          ${p.level}
          ${p.langs ? `<div class="tc-langs" style="margin-bottom: 20px">${p.langs}</div>` : ""}
          ${p.videos ? `<div class="tc-links" style="margin-bottom: 16px">${p.videos}</div>` : ""}
          <a class="tc-enroll-btn" style="max-width: 280px" href="${p.enroll}" target="_blank" rel="noopener">
            <span data-i18n="teachers.enrollBtn">Записаться к этому педагогу</span><span class="tc-enroll-btn-arrow">→</span>
          </a>
        </div>
      </div>`;
  }

  // Teachers
  const vocalGrid = document.querySelector('[data-content="teachers-vocal"]');
  const instrGrid = document.querySelector('[data-content="teachers-instruments"]');
  const vocalHtml = [];
  const instrHtml = [];
  (C.teachers || []).forEach((t, idx) => {
    if (t.hidden) return;
    const key = "t.k" + idx;
    if (t.section === "instruments") instrHtml.push(instrCard(t, key));
    else vocalHtml.push(vocalCard(t, key));
  });
  if (vocalGrid) vocalGrid.innerHTML = vocalHtml.join("");
  if (instrGrid) instrGrid.innerHTML = instrHtml.join("");

  // Discount labels ("−6% от разового") for every percentage used in prices
  function discKey(n) {
    n = Number(n) || 0;
    const byLang = {};
    LANGS.concat("be").forEach((l) => {
      const tpl = (window.i18n && window.i18n.tr && window.i18n.tr(l, "pricing.discTpl")) || "−{n}%";
      byLang[l] = tpl.replace("{n}", n);
    });
    put("disc.d" + n, byLang);
    return "content.disc.d" + n;
  }
  // Price plan cards (vocal and instruments)
  function priceRow(labelKey, minutes, val, unitKey, notePer, disc) {
    const note = notePer
      ? `<div class="pr-note">${esc(notePer)} zł <span data-i18n="pricing.perLesson">/ урок</span></div>`
      : `<div class="pr-note" data-i18n="pricing.min${minutes}">${minutes} минут</div>`;
    const discHtml = disc ? `<div class="pr-discount" data-i18n="${discKey(disc)}"></div>` : "";
    return `
      <div class="price-row">
        <div class="pr-left">
          <div class="pr-label" data-i18n="${labelKey}"></div>
          ${note}
        </div>
        <div class="pr-right">
          <div class="pr-val">${esc(val)} zł</div>
          <div class="pr-unit" data-i18n="${unitKey}"></div>
          ${discHtml}
        </div>
      </div>`;
  }
  function planCard(p, key) {
    const minutes = Number(p.minutes) === 30 ? 30 : 50;
    const style = ["basic", "pro", "top", "kids"].includes(p.style) ? p.style : "basic";
    return `
      <div class="price-card plan-card plan-${style} reveal">
        ${p.badge ? `<div class="plan-badge">${esc(p.badge)}</div>` : ""}
        <div class="pc-title" data-i18n="${put(key + ".title", p.title || {})}">${esc((p.title && p.title.ru) || "")}</div>
        <div class="pc-sub" data-i18n="${put(key + ".sub", p.sub || {})}">${esc((p.sub && p.sub.ru) || "")}</div>
        ${priceRow("pricing.trial", minutes, p.trial, "pricing.perLesson")}
        ${priceRow("pricing.single", minutes, p.single, "pricing.perLesson")}
        ${priceRow("pricing.sub4", minutes, p.sub4total, "pricing.perMonth", p.sub4per, p.sub4disc)}
        ${priceRow("pricing.sub8", minutes, p.sub8total, "pricing.perMonth", p.sub8per, p.sub8disc)}
      </div>`;
  }
  ["vocal", "instruments"].forEach((grp) => {
    const box = document.querySelector(`[data-content="prices-${grp}"]`);
    const plans = ((C.prices && C.prices[grp]) || []).filter((p) => !p.hidden);
    if (!box) return;
    box.classList.remove("plans-3", "plans-4");
    box.classList.add(plans.length >= 4 ? "plans-4" : "plans-3");
    box.innerHTML = plans.map((p, i) => planCard(p, "p." + grp + i)).join("");
  });

  // Gallery
  const g = C.gallery || {};
  const tagBox = document.querySelector('[data-content="gallery-tags"]');
  const photoBox = document.querySelector('[data-content="gallery-photos"]');
  if (tagBox) {
    const allKey = put("g.all", { ru: "Все", en: "All", pl: "Wszystkie" });
    tagBox.innerHTML =
      `<button class="gallery-tag active" data-tag="all" data-i18n="${allKey}">Все</button>` +
      (g.tags || [])
        .map((tag) => {
          const k = put("g.tag_" + String(tag.id).replace(/[^\w-]/g, "_"), tag.label || {});
          return `<button class="gallery-tag" data-tag="${esc(tag.id)}" data-i18n="${k}">${esc((tag.label && tag.label.ru) || tag.id)}</button>`;
        })
        .join("");
  }
  if (photoBox) {
    photoBox.innerHTML = (g.photos || [])
      .map(
        (ph) => `
        <div class="gallery-item" data-tags="${esc((ph.tags || []).join(" "))}">
          <img data-src="${esc(safeUrl(ph.src))}" alt="${esc(ph.alt || "")}" loading="lazy" />
          <div class="gallery-overlay"></div>
        </div>`
      )
      .join("");
  }

  if (window.i18n && window.i18n.addTranslations) window.i18n.addTranslations(tr);
})();
