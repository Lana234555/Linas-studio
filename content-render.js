// ── RENDER CONTENT FROM content.js ──
// Draws teacher cards, kids prices and the photo gallery from window.SITE_CONTENT
// (edited through /admin/). Runs before script.js so reveal animations, the gallery
// filter and the lightbox see the rendered elements.
(function () {
  // /?preview=1 shows the unpublished draft saved by the admin page in this browser
  // Inside the admin's preview panel (iframe named "linaPreview") the draft comes from the admin page itself
  try {
    let draft = null;
    if (window.name === "linaPreview" && window.parent !== window && window.parent.__linaPreviewDraft) {
      draft = window.parent.__linaPreviewDraft;
      window.__linaInAdminPreview = true;
    } else if (/[?&]preview=1\b/.test(location.search)) {
      draft = JSON.parse(localStorage.getItem("linaAdminPreview") || "null");
    }
    {
      if (draft) {
        window.SITE_CONTENT = draft;
        const bar = document.createElement("div");
        bar.textContent = "Попередній перегляд: ці зміни ще не опубліковані";
        bar.style.cssText = "position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:2000;background:#00c4b3;color:#041311;padding:8px 16px;border-radius:999px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.4)";
        if (!window.__linaInAdminPreview) document.body.appendChild(bar);
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
  // Photos: also allow unsaved photos (data:image) that the admin preview passes in
  function safeImg(u) {
    u = String(u || "").trim();
    return /^data:image\/(jpeg|png|webp);base64,/i.test(u) ? u : safeUrl(u);
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

  const ENROLL_DEFAULT = "#contact";
  // Links inside the page (#contact) open in place, outside links in a new tab
  function tgt(u) {
    return /^#/.test(String(u || "").trim()) ? "" : ' target="_blank" rel="noopener"';
  }
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
      photo: esc(safeImg(t.photo)),
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
          <a class="tc-enroll-btn" href="${p.enroll}"${tgt(p.enroll)}>
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
          <a class="tc-enroll-btn" style="max-width: 280px" href="${p.enroll}"${tgt(p.enroll)}>
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
        <a class="plan-book" href="${esc(safeUrl(p.bookUrl || ENROLL_DEFAULT))}"${tgt(p.bookUrl || ENROLL_DEFAULT)} data-i18n="pricing.instrBookBtn">Записаться на урок →</a>
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
          <img data-src="${esc(safeImg(ph.src))}" alt="${esc(ph.alt || "")}" loading="lazy" />
          <div class="gallery-overlay"></div>
        </div>`
      )
      .join("");
  }

  // ── Halls (rent): rooms, rent prices, conditions ──
  const H = C.halls;
  const SQM_ICON = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 3v18"/></svg>';
  const COND_ICONS = [
    '<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>',
    '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 3"/>',
    '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  ];
  // text helper that also keeps an optional Belarusian ("be") translation
  function txt(obj, field) {
    const out = {};
    LANGS.concat("be").forEach((l) => {
      const v = obj && obj[l] && (field ? obj[l][field] : obj[l]);
      if (v) out[l] = v;
    });
    return out;
  }
  function i18nEl(tag, attrs, key, byLang) {
    return `<${tag}${attrs} data-i18n="${put(key, byLang)}">${esc(byLang.ru || "")}</${tag}>`;
  }
  if (H) {
    const intro = document.querySelector('[data-content="halls-intro"]');
    if (intro && H.intro && H.intro.ru) intro.setAttribute("data-i18n", put("h.intro", txt(H.intro)));
    const grid = document.querySelector('[data-content="halls"]');
    if (grid) {
      grid.innerHTML = (H.rooms || [])
        .filter((r) => !r.hidden)
        .map((r, i) => {
          const k = "h.r" + i;
          const feats = (r.features || [])
            .filter((f) => f && f.ru)
            .map((f, j) => i18nEl("span", ' class="hf"', k + ".f" + j, txt(f)))
            .join("");
          const book = safeUrl(r.bookUrl || ENROLL_DEFAULT);
          return `
            <div class="hall-card reveal">
              <div class="hall-img" style="padding: 0; overflow: hidden; position: relative">
                ${r.sqm ? `<div class="hall-sqm">${SQM_ICON} ${esc(r.sqm)} m²</div>` : ""}
                ${r.photo
                  ? `<img src="${esc(safeImg(r.photo))}" loading="lazy" alt="${esc((r.text && r.text.ru && r.text.ru.name) || "")}" style="width: 100%; height: 100%; object-fit: cover; object-position: center; display: block" onerror="this.parentElement.innerHTML = '${esc(r.emoji || "🎵")}'" />`
                  : `<span>${esc(r.emoji || "🎵")}</span>`}
              </div>
              <div class="hall-body">
                ${i18nEl("div", ' class="hall-name"', k + ".name", txt(r.text, "name"))}
                ${r.text && r.text.ru && r.text.ru.badge ? i18nEl("div", ' class="hall-badge"', k + ".badge", txt(r.text, "badge")) : ""}
                ${i18nEl("p", ' class="hall-desc"', k + ".desc", txt(r.text, "desc"))}
                ${feats ? `<div class="hall-features" style="margin-bottom: 0">${feats}</div>` : ""}
                <a href="${esc(book)}"${tgt(book)} class="btn-pill btn-teal" style="margin-top: 20px; font-size: 0.82rem" data-i18n="halls.bookBtn">Забронировать зал →</a>
              </div>
            </div>`;
        })
        .join("");
    }
    const pgrid = document.querySelector('[data-content="hall-prices"]');
    if (pgrid) {
      pgrid.innerHTML = (H.prices || [])
        .filter((p) => !p.hidden)
        .map((p, i) => {
          const k = "h.p" + i;
          return `
              <div class="hp-card${p.featured ? " hp-card--featured" : ""}">
                ${i18nEl("div", ' class="hp-type"', k + ".title", txt(p.title))}
                <div class="hp-price">${esc(p.price)} <span class="hp-cur">zł</span></div>
                ${p.unit && p.unit.ru ? i18nEl("div", ' class="hp-unit"', k + ".unit", txt(p.unit)) : ""}
              </div>`;
        })
        .join("");
    }
    const cbox = document.querySelector('[data-content="hall-conditions"]');
    if (cbox) {
      const conds = (H.conditions || []).filter((x) => x && x.ru);
      cbox.hidden = !conds.length;
      cbox.innerHTML = conds
        .map(
          (x, i) => `
              <div class="hp-cond-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" stroke-width="2">${COND_ICONS[i % COND_ICONS.length]}</svg>
                ${i18nEl("span", "", "h.c" + i, txt(x))}
              </div>`
        )
        .join("");
    }
  }

  // ── Founder ("О студии") ──
  const F = C.founder;
  if (F) {
    const img = document.querySelector('[data-content="founder-photo"]');
    if (img && F.photo) img.src = safeImg(F.photo);
    const badge = document.querySelector('[data-content="founder-badge"]');
    if (badge)
      badge.innerHTML =
        i18nEl("div", ' class="founder-badge-title"', "f.bt", txt(F.text, "badgeTitle")) + i18nEl("div", ' class="founder-badge-val"', "f.bv", txt(F.text, "badgeVal"));
    const body = document.querySelector('[data-content="founder-body"]');
    if (body) {
      const title = {};
      LANGS.concat("be").forEach((l) => {
        const t = F.text && F.text[l];
        if (t && (t.title || t.titleEm)) title[l] = esc(t.title || "") + "<br /><em>" + esc(t.titleEm || "") + "</em>";
      });
      const stats = (F.stats || [])
        .filter((s) => s && s.num)
        .map(
          (s, i) => `
                <div class="fstat">
                  <div class="fstat-num"${s.gold ? ' style="color: var(--gold)"' : ""}>${esc(s.num)}</div>
                  ${i18nEl("div", ' class="fstat-label"', "f.s" + i, txt(s.label))}
                </div>`
        )
        .join("");
      const tags = (F.tags || []).filter((x) => x && x.ru).map((x, i) => i18nEl("span", ' class="ftag"', "f.t" + i, txt(x))).join("");
      const vids = (F.videos || [])
        .filter((v) => v && v.url)
        .map((v, i) => {
          const lab = {};
          LANGS.concat("be").forEach((l) => {
            const x = v.label && (v.label[l] || (l === "ru" ? "" : v.label.ru));
            if (x) lab[l] = "▶︎ " + x;
          });
          if (!lab.ru) lab.ru = "▶︎ Видео";
          return `<a href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener" class="vlink" data-i18n="${put("f.v" + i, lab)}">${esc(lab.ru)}</a>`;
        })
        .join("");
      body.innerHTML = `
              <h2 data-i18n-html="${put("f.title", title)}">${title.ru || ""}</h2>
              ${["p1", "p2", "p3"].filter((f) => F.text && F.text.ru && F.text.ru[f]).map((f) => i18nEl("p", "", "f." + f, txt(F.text, f))).join("")}
              ${stats ? `<div class="founder-stats">${stats}</div>` : ""}
              ${tags ? `<div class="founder-tags">${tags}</div>` : ""}
              ${vids ? `<div class="vid-links">${vids}</div>` : ""}`;
    }
  }

  // ── Gift certificate ──
  const G = C.cert;
  if (G) {
    const img = document.querySelector('[data-content="cert-image"]');
    if (img && G.image) img.src = safeImg(G.image);
    ["p1", "p2"].forEach((f) => {
      const el = document.querySelector(`[data-content="cert-${f}"]`);
      if (el && G.text && G.text.ru && G.text.ru[f]) el.setAttribute("data-i18n", put("c." + f, txt(G.text, f)));
    });
    const price = document.querySelector('[data-content="cert-price"]');
    if (price && G.price) price.textContent = G.price;
    const cur = document.querySelector('[data-content="cert-cur"]');
    if (cur && G.currency) cur.textContent = G.currency;
  }

  if (window.i18n && window.i18n.addTranslations) window.i18n.addTranslations(tr);
})();
