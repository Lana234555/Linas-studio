// Lina's Studio admin panel.
// Reads and writes content.js in the GitHub repo through the GitHub API, using a
// fine-grained personal access token stored in this browser. Photos are resized in
// the browser and committed together with content.js in one commit.
(function () {
  "use strict";

  const OWNER = "Lana234555";
  const REPO = "linas-studio";
  const BRANCH = "main";
  const CONTENT_PATH = "content.js";
  const TOKEN_KEY = "linaAdminToken";
  const PREVIEW_KEY = "linaAdminPreview";
  const DRAFT_KEY = "linaAdminDraft";
  const LANGS = [
    ["ru", "RU"],
    ["en", "EN"],
    ["pl", "PL"],
  ];
  const LANG_HINT = { ru: "Тексти російською (основна мова сайту)", en: "Тексти англійською", pl: "Тексти польською" };
  const LEVELS = [
    ["basic", "Basic"],
    ["pro", "Pro"],
    ["top", "Top"],
  ];
  const PLAN_STYLES = [
    ["basic", "Basic"],
    ["pro", "Pro"],
    ["top", "Top (виділена)"],
    ["kids", "Kids"],
  ];
  const ENROLL_DEFAULT = "#contact";
  const ALL_TABS = ["events", "teachers", "prices", "halls", "about", "cert", "gallery", "history"];
  const HISTORY_DAYS = 30;
  // Only files inside these folders are ever deleted by the admin
  const DELETABLE = /^photo\/(gallery|koncert|kvartirnyky|kemp|teachers|events|halls|about|cert)\//;

  const state = {
    token: null,
    original: null, // content as last loaded/published
    content: null, // working copy
    contentSha: null, // blob sha of content.js at load time
    pending: {}, // path -> { dataUrl, base64 } for newly added photos
    tab: "events",
    galleryFilter: "all",
    uploadTag: "", // "" = choose after upload
  };

  // ── helpers ──
  const $ = (id) => document.getElementById(id);
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (v == null || v === false) return;
        if (k === "class") el.className = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "value") el.value = v;
        else if (k === "checked") el.checked = !!v;
        else el.setAttribute(k, v === true ? "" : v);
      });
    }
    children.flat(Infinity).forEach((c) => {
      if (c == null || c === false) return;
      el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
    });
    return el;
  }
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function toast(msg, bad) {
    const t = $("toast");
    t.textContent = msg;
    t.className = "toast" + (bad ? " bad" : "");
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), bad ? 7000 : 4000);
  }

  // ── small line icons for row actions ──
  const ICONS = {
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    grip: '<circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/>',
    tiles: '<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>',
    list: '<rect x="3.5" y="5" width="5" height="4" rx="1.2"/><rect x="3.5" y="15" width="5" height="4" rx="1.2"/><path d="M11.5 7h9M11.5 17h9"/>',
    eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4"/><path d="M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  };
  function icon(name) {
    const s = document.createElement("span");
    s.className = "ib-ico";
    s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
    return s;
  }
  function imgUrl(path) {
    if (!path) return "";
    if (state.pending[path]) return state.pending[path].dataUrl;
    if (state.restoreBlobs && state.restoreBlobs[path]) return state.restoreBlobs[path].url;
    return "../" + path;
  }
  function imgWithFallback(path, attrs) {
    const img = h("img", Object.assign({ src: imgUrl(path), alt: "", loading: "lazy" }, attrs || {}));
    img.addEventListener(
      "error",
      () => {
        const raw = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
        if (img.src !== raw) img.src = raw;
      },
      { once: true }
    );
    return img;
  }
  function slugify(s) {
    const map = { а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ё: "e", ж: "zh", з: "z", и: "y", і: "i", ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "iu", я: "ia" };
    return String(s || "")
      .toLowerCase()
      .split("")
      .map((c) => (map[c] !== undefined ? map[c] : c))
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }
  function b64ToUtf8(b64) {
    const bin = atob(b64.replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }

  // ── GitHub API ──
  async function gh(path, opts) {
    opts = opts || {};
    const res = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + path, {
      method: opts.method || "GET",
      headers: Object.assign(
        {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + state.token,
          "X-GitHub-Api-Version": "2022-11-28",
        },
        opts.body ? { "Content-Type": "application/json" } : {}
      ),
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
    });
    if (!res.ok) {
      let msg = res.status + "";
      try {
        msg += " " + (await res.json()).message;
      } catch (e) {}
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  function parseContent(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return JSON.parse(text.slice(start, end + 1));
  }
  function serializeContent(c) {
    return (
      "// Контент сайту. Редагується через /admin/. Цей файл перезаписується адмінкою.\n" +
      "window.SITE_CONTENT = " +
      JSON.stringify(c, null, 2) +
      ";\n"
    );
  }

  async function fetchContentFile() {
    const f = await gh("/contents/" + CONTENT_PATH + "?ref=" + BRANCH);
    return { sha: f.sha, content: parseContent(b64ToUtf8(f.content)) };
  }

  // ── referenced files ──
  function referencedPaths(c) {
    const set = new Set();
    (c.teachers || []).forEach((t) => t.photo && set.add(t.photo));
    ((c.gallery && c.gallery.photos) || []).forEach((p) => p.src && set.add(p.src));
    (c.events || []).forEach((e) => e.image && set.add(e.image));
    ((c.halls && c.halls.rooms) || []).forEach((r) => r.photo && set.add(r.photo));
    if (c.founder && c.founder.photo) set.add(c.founder.photo);
    if (c.cert && c.cert.image) set.add(c.cert.image);
    return set;
  }

  // ── dirty tracking ──
  function isDirty() {
    return JSON.stringify(state.content) !== JSON.stringify(state.original);
  }
  // ── draft: unpublished changes survive closing or reloading the page ──
  function saveDraft() {
    try {
      if (!state.content || !isDirty()) { localStorage.removeItem(DRAFT_KEY); state.draftSavedAt = null; return; }
      const base = { base: state.contentSha, savedAt: new Date().toISOString(), content: state.content, restoredFrom: state.restoredFrom || null, restoreBlobs: state.restoreBlobs || {}, draftKeys: state.draftKeys || [] };
      const pending = {};
      Object.keys(state.pending).forEach((p) => (pending[p] = { dataUrl: state.pending[p].dataUrl }));
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(Object.assign({ pending }, base)));
        state.draftNoPhotos = false;
      } catch (e) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(Object.assign({ pending: {} }, base)));
        state.draftNoPhotos = Object.keys(pending).length > 0;
      }
      state.draftSavedAt = base.savedAt;
    } catch (e) {}
  }
  function loadDraft() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) {}
    if (!d || !d.content || JSON.stringify(d.content) === JSON.stringify(state.original)) return;
    const pending = {};
    Object.keys(d.pending || {}).forEach((p) => {
      const u = d.pending[p].dataUrl;
      if (u) pending[p] = { dataUrl: u, base64: u.slice(u.indexOf(",") + 1) };
    });
    // drop photos that did not fit into the browser storage
    const known = referencedPaths(state.original);
    const strip = (p) => p && !pending[p] && !(d.restoreBlobs || {})[p] && !known.has(p) && /^photo\/(gallery|teachers|events|halls|about|cert)\//.test(p) && /-\d{6,}/.test(p);
    const c = d.content;
    if (c.gallery && c.gallery.photos) c.gallery.photos = c.gallery.photos.filter((x) => !strip(x.src));
    state.content = c;
    state.pending = pending;
    state.restoreBlobs = d.restoreBlobs || {};
    state.restoredFrom = d.restoredFrom || null;
    state.draftKeys = d.draftKeys || [];
    state.draftSavedAt = d.savedAt;
    const changedNow = changedTabs().map((t) => TAB_NAMES[t]);
    const when = fmtWhen(d.savedAt);
    const warn = d.base && d.base !== state.contentSha ? " Увага: після цього сайт уже публікували, тож перегляньте все перед публікацією." : "";
    setTimeout(() => toast("Відновлено чернетку від " + when + (changedNow.length ? " (" + changedNow.join(", ") + ")" : "") + ". Можна продовжувати або натиснути «Скасувати»." + warn, !!warn), 300);
  }
  function updateSavebar() {
    saveDraft();
    const dirty = isDirty();
    $("savebar").classList.toggle("dirty", dirty);
    $("saveStatus").textContent = dirty ? (state.draftSavedAt ? "Чекає публікації · " + new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(state.draftSavedAt)) : "Є неопубліковані зміни") : "Усі зміни опубліковані";
    $("publishBtn").disabled = !dirty;
    $("discardBtn").disabled = !dirty;
    renderSide();
    markDrafts();
  }
  function changed() {
    render();
    updateSavebar();
  }

  // ── image processing ──
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Не вдалося відкрити зображення"));
      img.src = src;
    });
  }
  // iPhone photos (HEIC/HEIF): Safari opens them itself, other browsers need a converter (loaded only when needed)
  const isHeic = (f) => /image\/hei[cf]/i.test(f.type || "") || /\.hei[cf]$/i.test(f.name || "");
  // converter: heic-to (newer libheif, works with recent iPhones, no eval) — loaded only when needed
  let heicLib = null;
  function loadHeicLib() {
    if (!heicLib) {
      const url = new URL((window.LINA_VENDOR_BASE || "vendor/") + "heic-to.csp.js", document.baseURI).href;
      heicLib = import(url).then((m) => m.heicTo).catch((e) => { heicLib = null; throw new Error("Не вдалося завантажити перетворювач HEIC (" + (e && e.message) + ")"); });
    }
    return heicLib;
  }
  async function openAnyImage(file) {
    try {
      return await loadImage(await readFile(file));
    } catch (e) {
      if (!isHeic(file)) throw e;
      const heicTo = await loadHeicLib();
      let out;
      try {
        out = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
      } catch (err) {
        throw new Error("Не вдалося перетворити фото HEIC: " + ((err && err.message) || err));
      }
      return loadImage(await readFile(out));
    }
  }
  async function resizeToJpeg(file, maxSide) {
    const img = await openAnyImage(file);
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const hgt = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = hgt;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, hgt);
    ctx.drawImage(img, 0, 0, w, hgt);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { dataUrl, base64: dataUrl.split(",")[1] };
  }
  // Photo editor presets per place on the site
  const PHOTO_KINDS = {
    teachers: { maxSide: 1000, aspect: 4 / 3, aspects: [["Як на картці", 4 / 3], ["Квадрат", 1], ["Вертикальне 3:4", 3 / 4], ["Оригінал", null]] },
    gallery: { maxSide: 1600, aspect: null, aspects: [["Оригінал", null], ["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["16:9", 16 / 9]] },
    events: { maxSide: 1600, aspect: 1.6, aspects: [["Як в афіші 16:10", 1.6], ["Оригінал", null], ["1:1", 1], ["4:5", 0.8]] },
    halls: { maxSide: 1600, aspect: 3, aspects: [["Як на картці 3:1", 3], ["16:9", 16 / 9], ["4:3", 4 / 3], ["Оригінал", null]] },
    about: { maxSide: 1400, aspect: 0.85, aspects: [["Як на сайті", 0.85], ["3:4", 3 / 4], ["Квадрат", 1], ["Оригінал", null]] },
    cert: { maxSide: 1600, aspect: null, aspects: [["Оригінал", null], ["Як зараз 2:1", 2.16], ["16:9", 16 / 9], ["4:3", 4 / 3]] },
  };
  function newPath(folder, baseName) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7);
    return `photo/${folder}/${baseName ? baseName + "-" : ""}${stamp}-${rand}.jpg`;
  }
  // Big phone photos are first scaled to 3000px so the editor stays fast
  async function fileToSource(file) {
    const res = await resizeToJpeg(file, 3000);
    return res.dataUrl;
  }
  // Opens the editor; returns the new pending path, or null when cancelled.
  async function editIntoPending(src, folder, baseName, title, extra) {
    const kind = PHOTO_KINDS[folder] || PHOTO_KINDS.gallery;
    const res = await window.PhotoEditor.open(src, Object.assign({ title, aspects: kind.aspects, aspect: kind.aspect, maxSide: kind.maxSide }, extra || {}));
    if (!res) return null;
    const path = newPath(folder, baseName);
    state.pending[path] = Object.assign(res, { orig: src });
    return path;
  }
  async function addPendingImage(file, folder, baseName, maxSide, title) {
    progress.show("Відкриваю фото…", null);
    let src;
    try {
      src = await fileToSource(file);
    } finally {
      progress.hide();
    }
    return editIntoPending(src, folder, baseName, title || "Нове фото");
  }
  // Re-edit a photo that is already in the content (pending or published)
  async function reeditImage(path, folder, baseName) {
    const src = (state.pending[path] && state.pending[path].orig) || imgUrl(path);
    try {
      return await editIntoPending(src, folder, baseName, "Редагування фото");
    } catch (e) {
      toast("Не вдалося відкрити фото для редагування: " + e.message, true);
      return null;
    }
  }

  // ── progress bar (photo processing and publishing) ──
  const progress = (function () {
    let box = null;
    function ensure() {
      if (box) return box;
      box = h("div", { class: "progress", hidden: true }, h("div", { class: "progress-text" }), h("div", { class: "progress-track" }, h("div", { class: "progress-bar" })));
      document.body.appendChild(box);
      return box;
    }
    return {
      show(text, frac) {
        const b = ensure();
        b.hidden = false;
        b.querySelector(".progress-text").textContent = text;
        const bar = b.querySelector(".progress-bar");
        bar.classList.toggle("indeterminate", frac == null);
        bar.style.width = frac == null ? "" : Math.round(Math.max(0.03, Math.min(1, frac)) * 100) + "%";
      },
      hide() {
        if (box) box.hidden = true;
      },
    };
  })();

  // ── hover hints: a small styled bubble for every element with a title ──
  // The native title is moved to data-tip so the browser's own slow tooltip does not double it.
  const tipBox = h("div", { class: "tip", role: "tooltip", hidden: true });
  document.body.appendChild(tipBox);
  let tipFor = null;
  function showTip(el) {
    if (el.hasAttribute("title")) {
      const t = el.getAttribute("title");
      el.removeAttribute("title");
      if (t) el.setAttribute("data-tip", t);
    }
    const text = el.getAttribute("data-tip");
    if (!text) return;
    tipFor = el;
    tipBox.textContent = text;
    tipBox.hidden = false;
    const r = el.getBoundingClientRect();
    const b = tipBox.getBoundingClientRect();
    let left = r.left + r.width / 2 - b.width / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - b.width - 8));
    let top = r.top - b.height - 8;
    tipBox.classList.toggle("below", top < 8);
    if (top < 8) top = r.bottom + 8;
    tipBox.style.left = left + "px";
    tipBox.style.top = top + "px";
  }
  function hideTip() {
    tipFor = null;
    tipBox.hidden = true;
  }
  document.addEventListener("mouseover", (e) => {
    const el = e.target.closest && e.target.closest("[title], [data-tip]");
    if (el === tipFor) return;
    if (el) showTip(el);
    else hideTip();
  });
  document.addEventListener("focusin", (e) => {
    const el = e.target.closest && e.target.closest("[title], [data-tip]");
    if (el) showTip(el);
  });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("click", hideTip, true);
  window.addEventListener("scroll", hideTip, true);

  // ── phone layout: label every input of the multi-column rows ──
  // On a narrow screen the column headers are hidden, so each input gets its own small label
  // taken from the header row (RU / EN / PL / Посилання …).
  function labelRows(root) {
    root.querySelectorAll(".multi-head").forEach((head) => {
      const labels = Array.from(head.children).map((c) => c.textContent.trim());
      let row = head.nextElementSibling;
      while (row && row.classList.contains("multi-row")) {
        if (!row.dataset.labelled) {
          row.dataset.labelled = "1";
          Array.from(row.children).forEach((cell, i) => {
            if (!labels[i] || cell.tagName === "BUTTON" || cell.classList.contains("row-btns")) return;
            const wrap = h("label", { class: "mr-cell" }, h("span", { class: "mr-lab" }, labels[i]));
            row.insertBefore(wrap, cell);
            wrap.appendChild(cell);
          });
        }
        row = row.nextElementSibling;
      }
    });
  }
  new MutationObserver((muts) => {
    const roots = new Set();
    muts.forEach((m) => m.addedNodes.forEach((n) => n.nodeType === 1 && roots.add(n.parentElement || n)));
    roots.forEach((r) => r && labelRows(r));
  }).observe(document.body, { childList: true, subtree: true });

  // ── modal ──
  function openModal(node) {
    modalEdited = false;
    const body = $("modalBody");
    body.innerHTML = "";
    body.appendChild(node);
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
  }
  // Buttons at the bottom of every editor window.
  // apply() validates and saves the draft into the content; returns true on success.
  // every card as key -> JSON, to see which cards a save touched
  function cardSnapshot(c) {
    const m = new Map();
    if (!c) return m;
    (c.teachers || []).forEach((x) => m.set("teachers:" + x.id, JSON.stringify(x)));
    (c.events || []).forEach((x) => m.set("events:" + x.id, JSON.stringify(x)));
    ((c.halls && c.halls.rooms) || []).forEach((x) => m.set("rooms:" + x.id, JSON.stringify(x)));
    ((c.halls && c.halls.prices) || []).forEach((x, i) => m.set("hallprices:" + i, JSON.stringify(x)));
    ((c.gallery && c.gallery.photos) || []).forEach((x) => m.set("gallery:" + x.src, JSON.stringify(x)));
    ["vocal", "instruments"].forEach((g) => (((c.prices || {})[g]) || []).forEach((x, i) => m.set("plans:" + g + ":" + i, JSON.stringify(x))));
    return m;
  }
  // apply() and then remember whether the touched cards are an unsaved draft or saved
  function applyAs(apply, asDraft) {
    const before = cardSnapshot(state.content);
    if (!apply()) return false;
    const after = cardSnapshot(state.content);
    state.draftKeys = state.draftKeys || [];
    after.forEach((v, k) => {
      if (before.get(k) === v) return;
      state.draftKeys = state.draftKeys.filter((x) => x !== k);
      if (asDraft) state.draftKeys.push(k);
    });
    return true;
  }
  let modalApply = null;
  let modalKey = null;
  let lastCardKey = null;
  document.addEventListener("click", (e) => {
    const card = e.target.closest && e.target.closest("[data-dk]");
    lastCardKey = card ? card.getAttribute("data-dk") : null;
  }, true);
  let modalEdited = false;
  function editorActions(apply, section) {
    modalApply = apply;
    const key = modalKey;
    const done = (then) => () => {
      if (!applyAs(apply, false)) return;
      if (key) state.draftKeys = (state.draftKeys || []).filter((x) => x !== key);
      closeModal();
      changed();
      if (then) then();
    };
    return h(
      "div",
      { class: "modal-actions" },
      h("button", { class: "btn btn-ghost", type: "button", title: "Закрити вікно і не зберігати правки з нього", onclick: cancelModal }, "Скасувати"),
      h("span", { class: "pe-spacer" }),
      h("button", { class: "btn btn-ghost", type: "button", title: "Подивитися, як це виглядатиме на сайті", onclick: done(() => preview(section ? section() : "")) }, "👁 Переглянути на сайті"),
      h("button", { class: "btn btn-teal", type: "button", title: "Зберегти в чернетку. На сайт зміни потраплять після загальної кнопки «Опублікувати на сайті» внизу", onclick: done(() => toast("Зміни збережено. Коли все буде готово, натисніть «Опублікувати на сайті» внизу.")) }, "Зберегти зміни")
    );
  }
  function closeModal() {
    $("modal").hidden = true;
    document.body.style.overflow = "";
    modalApply = null;
    modalEdited = false;
    modalKey = null;
  }
  // Accidental exit (Esc, click outside the window): keep what was typed in the draft instead of losing it.
  function softCloseModal() {
    if (modalApply && modalEdited) {
      if (!applyAs(modalApply, true)) return;
      closeModal();
      changed();
      toast("Ви вийшли без збереження, тож правки лишилися чернеткою. Відкрийте картку й натисніть «Зберегти зміни».");
      return;
    }
    closeModal();
  }
  function cancelModal() {
    if (modalApply && modalEdited && !confirm("Закрити вікно і скасувати правки в ньому?")) return;
    closeModal();
  }

  // small reusable widgets
  function langTabs(onSwitch, initial) {
    const wrap = h("div", { class: "lang-tabs" });
    LANGS.forEach(([code, label]) => {
      const b = h("button", { class: "lang-tab" + (code === initial ? " active" : ""), type: "button", title: LANG_HINT[code] }, label);
      b.addEventListener("click", () => {
        wrap.querySelectorAll(".lang-tab").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        onSwitch(code);
      });
      wrap.appendChild(b);
    });
    return wrap;
  }
  function select(options, value, onChange) {
    const s = h("select", { onchange: (e) => onChange(e.target.value) }, options.map(([v, l]) => h("option", { value: v }, l)));
    s.value = value;
    return s;
  }
  function field(label, input) {
    return h("label", { class: "field" }, h("span", null, label), input);
  }
  function textInput(value, onInput, attrs) {
    return h("input", Object.assign({ type: "text", value: value || "", oninput: (e) => onInput(e.target.value) }, attrs || {}));
  }
  function numInput(value, onInput) {
    return h("input", { type: "number", min: "0", step: "1", value: value == null ? "" : value, oninput: (e) => onInput(e.target.value === "" ? 0 : Number(e.target.value)) });
  }

  // ── TEACHERS ──
  function emptyTeacher(section) {
    const text = {};
    LANGS.forEach(([l]) => (text[l] = { name: "", role: "", bio: "", langs: "", level: "" }));
    return { id: "t" + Date.now().toString(36), section, level: "basic", emoji: section === "instruments" ? "🎸" : "🎤", photo: "", text, tags: [], videos: [], enrollUrl: ENROLL_DEFAULT };
  }

  function renderTeachers() {
    const view = $("teachersView");
    view.innerHTML = "";
    view.appendChild(
      h("div", { class: "view-head" }, h("div", null, h("div", { class: "chip" }, "Картки"), h("h2", null, "Викладачі")), h("p", { class: "muted" }, "Порядок тут такий самий, як на сайті."))
    );
    [
      ["vocal", "Вокал"],
      ["instruments", "Інструменти"],
    ].forEach(([section, title]) => {
      const list = state.content.teachers.map((t, i) => ({ t, i })).filter((x) => (x.t.section || "vocal") === section);
      const rows = h("div", { class: "row-list" });
      list.forEach(({ t, i }, pos) => {
        const ru = (t.text && t.text.ru) || {};
        rows.appendChild(
          h(
            "div",
            { class: "trow" + (t.hidden ? " is-hidden" : ""), "data-dk": "teachers:" + t.id },
            dragHandle(),
            t.photo ? imgWithFallback(t.photo) : h("div", { class: "ph" }, t.emoji || "🎵"),
            h(
              "div",
              null,
              h("div", { class: "trow-name" }, ru.name || "(без імені)", h("span", { class: "badge " + t.level }, t.level || "basic"), t.hidden ? h("span", { class: "badge off" }, "приховано") : null),
              h("div", { class: "trow-role" }, ru.role || "")
            ),
            h(
              "div",
              { class: "trow-actions" },
              h("button", { class: "icon-btn act", title: "Редагувати", "aria-label": "Редагувати", onclick: () => editTeacher(i) }, icon("edit")),
              h("button", { class: "icon-btn act", title: t.hidden ? "Показати на сайті" : "Сховати з сайту", "aria-label": t.hidden ? "Показати" : "Сховати", onclick: () => { t.hidden = !t.hidden; changed(); } }, icon(t.hidden ? "eyeOff" : "eye")),
              h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => deleteTeacher(i) }, "✕")
            )
          )
        );
      });
      if (!list.length) rows.appendChild(h("p", { class: "muted" }, "Поки немає карток."));
      sortable(rows, ".trow", (from, to) => {
        const arr = state.content.teachers;
        const idx = list.map((x) => x.i);
        const items = idx.map((k) => arr[k]);
        moveItem(items, from, to);
        idx.forEach((k, n) => (arr[k] = items[n]));
        changed();
      });
      view.appendChild(
        h(
          "div",
          { class: "group" },
          h("div", { class: "group-head" }, h("h3", null, title), h("button", { class: "btn btn-teal btn-small", onclick: () => editTeacher(-1, section) }, "+ Додати викладача")),
          rows
        )
      );
    });
  }

  // ── drag & drop reordering (mouse and touch), by the ⠿ handle ──
  function dragHandle(what) {
    return h("button", { class: "drag-handle", type: "button", title: "Перетягніть, щоб змінити порядок" + (what ? " " + what : ""), "aria-label": "Перетягнути" }, icon("grip"));
  }
  function moveItem(arr, from, to) {
    const [x] = arr.splice(from, 1);
    arr.splice(to, 0, x);
  }
  function sortable(container, cardSel, onDone) {
    container.addEventListener("pointerdown", (e) => {
      const handle = e.target.closest(".drag-handle");
      if (!handle || !container.contains(handle) || e.button > 0) return;
      const card = handle.closest(cardSel);
      if (!card || card.parentElement !== container) return;
      e.preventDefault();
      const cards = () => [...container.children].filter((c) => c.matches(cardSel));
      const from = cards().indexOf(card);
      const scroller = $("app");
      let lastY = e.clientY, lastX = e.clientX, raf = 0;
      card.classList.add("dragging");
      document.querySelectorAll(".tip").forEach((t) => (t.hidden = true));
      container.classList.add("sorting");
      const place = () => {
        const list = cards();
        const cur = list.indexOf(card);
        for (const other of list) {
          if (other === card) continue;
          const r = other.getBoundingClientRect();
          if (lastX < r.left || lastX > r.right || lastY < r.top || lastY > r.bottom) continue;
          const oi = list.indexOf(other);
          if (oi < cur) other.before(card); else other.after(card);
          break;
        }
      };
      const tick = () => {
        // scroll the content panel when dragging near its top or bottom
        const box = scroller.getBoundingClientRect();
        const top = Math.max(box.top, 0), bottom = Math.min(box.bottom, window.innerHeight);
        if (lastY < top + 70) { scroller.scrollTop -= 14; window.scrollBy(0, -14); }
        else if (lastY > bottom - 110) { scroller.scrollTop += 14; window.scrollBy(0, 14); }
        place();
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      const move = (ev) => { lastX = ev.clientX; lastY = ev.clientY; };
      const up = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
        window.removeEventListener("pointercancel", up);
        card.classList.remove("dragging");
        container.classList.remove("sorting");
        const to = cards().indexOf(card);
        if (to !== from) onDone(from, to);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
    });
  }


  // ── deleting needs two confirmations, in the admin's own window ──
  function askDelete(what, onYes) {
    const old = document.getElementById("delAsk");
    if (old) old.remove();
    const close = () => ov.remove();
    const box = h("div", { class: "del-box" });
    const ov = h("div", { class: "del-overlay", id: "delAsk", onclick: (e) => { if (e.target === ov) close(); } }, box);
    const step1 = () => box.replaceChildren(
      h("div", { class: "del-ico" }, "🗑"),
      h("h3", null, "Видалити " + what + "?"),
      h("p", { class: "muted" }, "Крок 1 з 2. Після публікації це зникне з сайту."),
      h("div", { class: "del-actions" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: close }, "Ні, залишити"),
        h("button", { class: "btn btn-danger", type: "button", onclick: step2 }, "Так, видалити")));
    const step2 = () => box.replaceChildren(
      h("div", { class: "del-ico warn" }, "⚠"),
      h("h3", null, "Точно видалити?"),
      h("p", { class: "muted" }, "Крок 2 з 2. " + what.charAt(0).toUpperCase() + what.slice(1) + " буде видалено. До публікації це ще можна повернути кнопкою «Скасувати» внизу."),
      h("div", { class: "del-actions" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: close }, "Ні, залишити"),
        h("button", { class: "btn btn-danger solid", type: "button", onclick: () => { close(); onYes(); toast("Видалено. На сайті зникне після публікації."); } }, "Видалити остаточно")));
    step1();
    document.body.appendChild(ov);
    const b = box.querySelector(".btn-ghost");
    if (b) b.focus();
  }

  function deleteTeacher(i) {
    const name = (state.content.teachers[i].text.ru || {}).name || "цю картку";
    askDelete(`картку «${name}»`, () => { state.content.teachers.splice(i, 1); changed(); });
  }

  function editTeacher(index, section) {
    modalKey = index >= 0 ? lastCardKey : null;
    const isNew = index < 0;
    const t = isNew ? emptyTeacher(section) : clone(state.content.teachers[index]);
    t.text = t.text || {};
    LANGS.forEach(([l]) => (t.text[l] = Object.assign({ name: "", role: "", bio: "", langs: "", level: "" }, t.text[l] || {})));
    t.tags = t.tags || [];
    t.videos = t.videos || [];
    let lang = "ru";

    const photoBox = h("div", { class: "photo-pick" });
    function drawPhoto() {
      photoBox.innerHTML = "";
      photoBox.appendChild(t.photo ? imgWithFallback(t.photo) : h("div", { class: "ph" }, t.emoji || "🎵"));
      const input = h("input", { type: "file", accept: "image/*,.heic,.heif" });
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const p = await addPendingImage(file, "teachers", slugify(t.text.ru.name) || "teacher", 1000, "Фото викладача");
          input.value = "";
          if (p) { t.photo = p; drawPhoto(); }
        } catch (e) {
          toast(e.message, true);
        }
      });
      photoBox.appendChild(
        h(
          "div",
          null,
          h("span", { class: "btn btn-ghost btn-small file-btn" }, t.photo ? "Змінити фото" : "Завантажити фото", input),
          t.photo ? h("button", { class: "btn btn-ghost btn-small", type: "button", style: "margin-left:8px", onclick: async () => { const p = await reeditImage(t.photo, "teachers", slugify(t.text.ru.name) || "teacher"); if (p) { t.photo = p; drawPhoto(); } } }, "✎ Редагувати фото") : null,
          t.photo ? h("button", { class: "link", type: "button", style: "margin-left:10px", onclick: () => { t.photo = ""; drawPhoto(); } }, "прибрати") : null,
          h("p", { class: "muted", style: "margin-top:8px" }, "Вертикальне або квадратне фото, обличчя в центрі.")
        )
      );
    }
    drawPhoto();

    const textBox = h("div");
    function drawText() {
      const d = t.text[lang];
      textBox.innerHTML = "";
      textBox.appendChild(
        h(
          "div",
          null,
          h("div", { class: "grid2" }, field("Ім'я", textInput(d.name, (v) => (d.name = v))), field("Роль (над ім'ям)", textInput(d.role, (v) => (d.role = v), { placeholder: "Вокал Basic" }))),
          field("Опис", h("textarea", { oninput: (e) => (d.bio = e.target.value) }, d.bio)),
          h("div", { class: "grid2" }, field("Мови викладання", textInput(d.langs, (v) => (d.langs = v), { placeholder: "Укр, Рус, Польский" })), field("Рівень учнів (необов'язково)", textInput(d.level, (v) => (d.level = v))))
        )
      );
    }
    drawText();

    const tagsBox = h("div");
    function drawTags() {
      tagsBox.innerHTML = "";
      if (t.tags.length) tagsBox.appendChild(h("div", { class: "multi-row tags multi-head" }, h("span", null, "RU"), h("span", null, "EN"), h("span", null, "PL"), h("span")));
      t.tags.forEach((tag, i) => {
        tagsBox.appendChild(
          h(
            "div",
            { class: "multi-row tags" },
            LANGS.map(([l]) => textInput(tag[l], (v) => (tag[l] = v), { placeholder: l.toUpperCase() })),
            h("button", { class: "icon-btn danger", type: "button", title: "Видалити тег", onclick: () => { t.tags.splice(i, 1); drawTags(); } }, "✕")
          )
        );
      });
    }
    drawTags();

    const videosBox = h("div");
    function drawVideos() {
      videosBox.innerHTML = "";
      if (t.videos.length)
        videosBox.appendChild(h("div", { class: "multi-row videos multi-head" }, h("span", null, "Посилання (YouTube)"), h("span", null, "Назва RU"), h("span", null, "EN"), h("span", null, "PL"), h("span")));
      t.videos.forEach((v, i) => {
        v.label = v.label || {};
        videosBox.appendChild(
          h(
            "div",
            { class: "multi-row videos" },
            textInput(v.url, (x) => (v.url = x.trim()), { placeholder: "https://youtube.com/shorts/…" }),
            LANGS.map(([l]) => textInput(v.label[l], (x) => (v.label[l] = x), { placeholder: "Назва " + l.toUpperCase() })),
            h("button", { class: "icon-btn danger", type: "button", title: "Видалити відео", onclick: () => { t.videos.splice(i, 1); drawVideos(); } }, "✕")
          )
        );
      });
    }
    drawVideos();

    const node = h(
      "div",
      null,
      h("h3", null, isNew ? "Новий викладач" : "Редагування картки"),
      h(
        "div",
        { class: "grid3" },
        field("Розділ", select([["vocal", "Вокал"], ["instruments", "Інструменти"]], t.section || "vocal", (v) => (t.section = v))),
        field("Рівень (бейдж)", select(LEVELS, t.level || "basic", (v) => (t.level = v))),
        field("Емодзі, якщо немає фото", textInput(t.emoji, (v) => (t.emoji = v)))
      ),
      h("div", { class: "sub-head" }, "Фото"),
      photoBox,
      h("div", { class: "sub-head" }, "Тексти"),
      langTabs((l) => { lang = l; drawText(); }, lang),
      textBox,
      h("div", { class: "sub-head" }, "Теги (жанри, інструменти)", h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { t.tags.push({ ru: "", en: "", pl: "" }); drawTags(); } }, "+ Тег")),
      tagsBox,
      h("div", { class: "sub-head" }, "Відео", h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { t.videos.push({ url: "", label: { ru: "Видео", en: "Video", pl: "Wideo" } }); drawVideos(); } }, "+ Відео")),
      videosBox,
      field("Куди веде кнопка «Записаться» (#contact = розділ «Контакти»)", textInput(t.enrollUrl, (v) => (t.enrollUrl = v.trim()))),
      editorActions(() => {
        if (!t.text.ru.name.trim()) return toast("Вкажіть ім'я російською (RU), це основна мова сайту.", true), false;
        t.tags = t.tags.filter((x) => (x.ru || x.en || x.pl || "").trim());
        t.videos = t.videos.filter((x) => (x.url || "").trim());
        if (isNew) state.content.teachers.push(t);
        else state.content.teachers[index] = t;
        return true;
      }, () => (t.section === "instruments" ? "instruments" : "vocal"))
    );
    openModal(node);
  }

  // ── PRICES ──
  function emptyPlan() {
    return { style: "basic", badge: "Basic", title: { ru: "", en: "", pl: "" }, sub: { ru: "", en: "", pl: "" }, minutes: 50, trial: 0, single: 0, sub4per: 0, sub4total: 0, sub4disc: 0, sub8per: 0, sub8total: 0, sub8disc: 0 };
  }
  function recalc(p) {
    p.sub4total = p.sub4per * 4;
    p.sub8total = p.sub8per * 8;
    p.sub4disc = p.single ? Math.max(0, Math.round((1 - p.sub4per / p.single) * 100)) : 0;
    p.sub8disc = p.single ? Math.max(0, Math.round((1 - p.sub8per / p.single) * 100)) : 0;
  }
  function renderPrices() {
    const view = $("pricesView");
    view.innerHTML = "";
    view.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("div", null, h("div", { class: "chip" }, "Прайс-лист"), h("h2", null, "Ціни")),
        h("p", { class: "muted" }, "Усі ціни в злотих. Кнопка «Порахувати» заповнює суми абонементів і знижки з ціни за урок.")
      )
    );
    state.content.prices = state.content.prices || { vocal: [], instruments: [] };
    [
      ["vocal", "Вокал"],
      ["instruments", "Інструменти"],
    ].forEach(([grp, title]) => {
      const plans = (state.content.prices[grp] = state.content.prices[grp] || []);
      const wrap = h("div", { class: "plans" });
      plans.forEach((p, i) => wrap.appendChild(planEditor(plans, p, i)));
      sortable(wrap, ".plan", (from, to) => { moveItem(plans, from, to); changed(); });
      view.appendChild(
        h(
          "div",
          { class: "group" },
          h("div", { class: "group-head" }, h("h3", null, title), h("button", { class: "btn btn-teal btn-small", onclick: () => { plans.push(emptyPlan()); changed(); } }, "+ Додати картку цін")),
          wrap
        )
      );
    });
  }
  function planEditor(plans, p, i) {
    let lang = "ru";
    const textBox = h("div");
    function drawText() {
      textBox.innerHTML = "";
      textBox.appendChild(field("Заголовок", textInput(p.title[lang], (v) => { p.title[lang] = v; updateSavebar(); })));
      textBox.appendChild(field("Підзаголовок", h("textarea", { style: "min-height:64px", oninput: (e) => { p.sub[lang] = e.target.value; updateSavebar(); } }, p.sub[lang] || "")));
    }
    p.title = p.title || {};
    p.sub = p.sub || {};
    drawText();
    const n = (key, label) => h("label", null, h("span", null, label), numInput(p[key], (v) => { p[key] = v; updateSavebar(); }));
    return h(
      "div",
      { class: "plan" + (p.hidden ? " is-hidden" : ""), "data-dk": "plans:" + (plans === state.content.prices.instruments ? "instruments" : "vocal") + ":" + i },
      h(
        "div",
        { class: "plan-head" },
        h("div", null, h("span", { class: "plan-title" }, (p.title && p.title.ru) || "Нова картка"), h("span", { class: "badge " + p.style }, p.badge || p.style), p.hidden ? h("span", { class: "badge off" }, "приховано") : null),
        h(
          "div",
          { class: "trow-actions" },
          dragHandle(),
          h("button", { class: "icon-btn", title: p.hidden ? "Показати" : "Сховати", onclick: () => { p.hidden = !p.hidden; changed(); } }, p.hidden ? "◌" : "◉"),
          h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => askDelete(`картку цін «${(p.title && p.title.ru) || ""} ${p.badge || ""}»`.replace(" »", "»"), () => { plans.splice(i, 1); changed(); }) }, "✕")
        )
      ),
      h(
        "div",
        { class: "grid3" },
        field("Стиль", select(PLAN_STYLES, p.style || "basic", (v) => { p.style = v; changed(); })),
        field("Бейдж", textInput(p.badge, (v) => { p.badge = v; updateSavebar(); })),
        field("Тривалість", select([["50", "50 хв"], ["30", "30 хв"]], String(p.minutes || 50), (v) => { p.minutes = Number(v); updateSavebar(); }))
      ),
      langTabs((l) => { lang = l; drawText(); }, lang),
      textBox,
      h(
        "div",
        { class: "price-grid" },
        n("trial", "Пробне заняття"),
        n("single", "Разове заняття"),
        n("sub4per", "Абонемент 4: за урок"),
        n("sub4total", "Абонемент 4: разом"),
        n("sub8per", "Абонемент 8: за урок"),
        n("sub8total", "Абонемент 8: разом"),
        n("sub4disc", "Знижка 4, %"),
        n("sub8disc", "Знижка 8, %")
      ),
      h("button", { class: "btn btn-ghost btn-small calc", onclick: () => { recalc(p); changed(); } }, "Порахувати суми і знижки"),
      h("label", { class: "field", style: "margin-top:12px" }, h("span", null, "Посилання кнопки «Записаться на урок»"), textInput(p.bookUrl || ENROLL_DEFAULT, (v) => { p.bookUrl = v.trim(); updateSavebar(); }))
    );
  }

  // ── GALLERY ──
  function renderGallery() {
    const view = $("galleryView");
    view.innerHTML = "";
    const g = (state.content.gallery = state.content.gallery || { tags: [], photos: [] });
    g.tags = g.tags || [];
    g.photos = g.photos || [];
    const tagLabel = (id) => {
      const t = g.tags.find((x) => x.id === id);
      return (t && t.label && t.label.ru) || id;
    };

    view.appendChild(
      h("div", { class: "view-head" }, h("div", null, h("div", { class: "chip" }, "Фото"), h("h2", null, "Галерея")), h("p", { class: "muted" }, `${g.photos.length} фото. На сайті вони показуються у випадковому порядку.`))
    );

    // tags
    const tagList = h("div", { class: "tag-list" });
    g.tags.forEach((tag) => {
      const count = g.photos.filter((p) => (p.tags || []).includes(tag.id)).length;
      tagList.appendChild(dropTarget(
        h(
          "span",
          { class: "tag-chip", title: "Можна перетягнути сюди фото з папки — вони додадуться в цей тег" },
          (tag.label && tag.label.ru) || tag.id,
          h("span", { class: "count" }, String(count)),
          h("button", { title: "Перейменувати", onclick: () => editTag(tag) }, "✎"),
          h(
            "button",
            {
              title: "Видалити тег",
              onclick: () => {
                if (!confirm(`Видалити тег «${tag.label.ru}»? Фото залишаться, з них просто зніметься цей тег.`)) return;
                g.tags = g.tags.filter((x) => x !== tag);
                g.photos.forEach((p) => (p.tags = (p.tags || []).filter((x) => x !== tag.id)));
                if (state.galleryFilter === tag.id) state.galleryFilter = "all";
                if (state.uploadTag === tag.id) state.uploadTag = "";
                changed();
              },
            },
            "✕"
          )
        ), (files) => handleFiles(files, tag.id)
      ));
    });
    tagList.appendChild(dropTarget(h("span", { class: "tag-chip tag-drop-new", title: "Перетягніть сюди фото з папки — створиться новий тег" }, "＋ фото в новий тег"), (files) => handleFiles(files, "")));
    const tagsGroup = (
      h("div", { class: "group tags-group" }, h("div", { class: "group-head" }, h("h3", null, "Теги"), h("button", { class: "btn btn-teal btn-small", onclick: () => editTag(null) }, "+ Новий тег")), tagList)
    );
    view.appendChild(tagsGroup);

    // upload: one photo → editor; many photos → quick batch (auto-resized, editable later with ✎)
    const fileInput = h("input", { type: "file", accept: "image/*,.heic,.heif", multiple: true });
    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      fileInput.value = "";
      handleFiles(files);
    });
    // files from the button or dragged in from a folder; tagId: undefined = use the choice above
    async function handleFiles(files, tagId) {
      files = files.filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|heic|gif)$/i.test(f.name));
      if (!files.length) { toast("Тут можна залишати тільки фото.", true); return; }
      const useTag = tagId === undefined ? state.uploadTag : tagId;
      if (files.length === 1) {
        try {
          const path = await addPendingImage(files[0], "gallery", "", 1600, "Нове фото");
          if (path) {
            const ph = { src: path, tags: useTag ? [useTag] : [], added: new Date().toISOString() };
            g.photos.unshift(ph);
            state.galleryFilter = "all";
            changed();
            afterUpload([ph], useTag);
          }
        } catch (e) { toast(files[0].name + ": " + e.message, true); }
        return;
      }
      const added = [];
      for (let i = 0; i < files.length; i++) {
        progress.show(`Додаю фото ${i + 1} з ${files.length}…`, i / files.length);
        try {
          const res = await resizeToJpeg(files[i], PHOTO_KINDS.gallery.maxSide);
          const path = newPath("gallery", "");
          state.pending[path] = Object.assign(res, { orig: res.dataUrl });
          added.push({ src: path, tags: useTag ? [useTag] : [], added: new Date().toISOString() });
        } catch (e) { toast(files[i].name + ": " + e.message, true); }
      }
      progress.hide();
      if (!added.length) return;
      g.photos = added.concat(g.photos);
      state.galleryFilter = "all"; // show everything: new on top, old below
      changed();
      afterUpload(added, useTag);
    }
    // drag-and-drop helper: highlight while files hover, call onFiles on drop
    function dropTarget(el, onFiles) {
      let depth = 0;
      const isFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
      el.addEventListener("dragenter", (e) => { if (!isFiles(e)) return; e.preventDefault(); e.stopPropagation(); depth++; el.classList.add("drop-over"); });
      el.addEventListener("dragover", (e) => { if (!isFiles(e)) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "copy"; });
      el.addEventListener("dragleave", (e) => { if (!isFiles(e)) return; e.stopPropagation(); if (--depth <= 0) { depth = 0; el.classList.remove("drop-over"); } });
      el.addEventListener("drop", (e) => { if (!isFiles(e)) return; e.preventDefault(); e.stopPropagation(); depth = 0; el.classList.remove("drop-over"); document.body.classList.remove("files-dragging"); onFiles(Array.from(e.dataTransfer.files || [])); });
      return el;
    }
    // after upload: photos already have the chosen tag, or we ask which tag to give them
    function afterUpload(list, useTag) {
      const n = list.length;
      const word = "фото";
      if (useTag) {
        toast(`Додано ${n} ${word} у тег «${tagLabel(useTag)}». Їх видно лише тут, поки ви не натиснете «Опублікувати на сайті».`);
        return;
      }
      let newName = "";
      const makeTag = () => {
        const name = newName.trim();
        if (!name) { toast("Напишіть назву нового тегу.", true); return; }
        const ex = g.tags.find((t) => ((t.label && t.label.ru) || "").toLowerCase() === name.toLowerCase());
        if (ex) return apply(ex.id);
        let id = slugify(name) || "tag", k = 2;
        const base = id;
        while (g.tags.some((x) => x.id === id) || id === "all") id = base + "-" + k++;
        g.tags.push({ id, label: { ru: name, en: name, pl: name } });
        apply(id);
      };
      const apply = (id) => {
        list.forEach((ph) => (ph.tags = id ? [id] : []));
        closeModal();
        state.galleryFilter = "all";
        changed();
        toast(id ? `${n} ${word} додано в тег «${tagLabel(id)}».` : `Додано ${n} ${word} без тегу. Тег можна вибрати пізніше.`);
      };
      openModal(
        h(
          "div",
          { class: "after-upload" },
          h("h3", null, `Додано ${n} ${word}`),
          h("p", { class: "muted" }, "До якого тегу (події) їх додати? Одне фото — один тег."),
          h("div", { class: "pick-tags" }, g.tags.map((t) => h("button", { class: "btn btn-teal", onclick: () => apply(t.id) }, tagLabel(t.id)))),
          h(
            "div",
            { class: "new-tag-row" },
            h("input", { type: "text", placeholder: "Або новий тег, наприклад «Кемп 2026»", oninput: (e) => (newName = e.target.value), onkeydown: (e) => { if (e.key === "Enter") makeTag(); } }),
            h("button", { class: "btn btn-ghost", onclick: makeTag }, "+ Створити тег і додати")
          ),
          h("p", { class: "muted small-note" }, "Назву англійською й польською можна потім поправити кнопкою ✎ біля тегу."),
          h("div", { class: "modal-actions" }, h("button", { class: "btn btn-ghost", onclick: () => apply("") }, "Просто додати всі фото без тегу"))
        )
      );
    }
    tagsGroup.appendChild(dropTarget(
      h(
        "div",
        { class: "upload-box" },
        h(
          "div",
          { class: "drop-zone" },
          h("span", { class: "dz-icon", "aria-hidden": "true" }, "⇩"),
          h("span", { class: "dz-text" }, h("strong", {}, "Перетягніть фото сюди"), h("span", {}, "можна багато одразу, або прямо на потрібний тег")),
          h("span", { class: "dz-or" }, "або"),
          h("span", { class: "btn btn-teal file-btn" }, "+ Вибрати фото", fileInput)
        ),
        h(
          "div",
          { class: "check-list" },
          h("span", { class: "up-to" }, "Куди:"),
          [["", "Виберу після завантаження"]].concat(g.tags.map((t) => [t.id, tagLabel(t.id)])).map(([id, label]) =>
            h(
              "label",
              { class: "check" + (state.uploadTag === id ? " on" : "") },
              h("input", { type: "radio", name: "uploadTag", checked: state.uploadTag === id, onchange: () => { state.uploadTag = id; renderGallery(); } }),
              label
            )
          )
        )
      )
    , (files) => handleFiles(files)));

    // filter + view switch
    const sel = (state.gallerySel = state.gallerySel || new Set());
    [...sel].forEach((src) => { if (!g.photos.some((p) => p.src === src)) sel.delete(src); });
    const shown = g.photos.filter((p) => {
      if (state.galleryFilter === "all") return true;
      if (state.galleryFilter === "__none") return !(p.tags || []).length;
      return (p.tags || []).includes(state.galleryFilter);
    });
    const mode = state.galleryMode || (state.galleryMode = (() => { try { return localStorage.getItem("linaGalleryMode") || "tiles"; } catch (e) { return "tiles"; } })());
    const setMode = (m) => { state.galleryMode = m; try { localStorage.setItem("linaGalleryMode", m); } catch (e) {} renderGallery(); };
    const filterOpts = [["all", "Усі фото"], ["__none", "Без тегів"]].concat(g.tags.map((t) => [t.id, (t.label && t.label.ru) || t.id]));
    const allShownSel = shown.length > 0 && shown.every((p) => sel.has(p.src));
    view.appendChild(
      h(
        "div",
        { class: "filter-row" },
        h("span", { class: "muted" }, "Показати:"),
        select(filterOpts, state.galleryFilter, (v) => { state.galleryFilter = v; if (g.tags.some((t) => t.id === v)) state.uploadTag = v; renderGallery(); }),
        h("button", { class: "btn btn-ghost btn-small sel-all", onclick: () => { shown.forEach((p) => (allShownSel ? sel.delete(p.src) : sel.add(p.src))); renderGallery(); } }, allShownSel ? "Зняти виділення" : "Вибрати всі"),
        h(
          "div",
          { class: "view-switch", role: "group", "aria-label": "Вигляд" },
          h("button", { class: mode === "tiles" ? "on" : "", title: "Великі плитки", "aria-label": "Великі плитки", onclick: () => setMode("tiles") }, icon("tiles")),
          h("button", { class: mode === "list" ? "on" : "", title: "Списком", "aria-label": "Списком", onclick: () => setMode("list") }, icon("list"))
        )
      )
    );

    // bulk bar for selected photos
    if (sel.size) {
      const selPhotos = g.photos.filter((p) => sel.has(p.src));
      view.appendChild(
        h(
          "div",
          { class: "bulk-bar" },
          h("strong", null, `Вибрано: ${sel.size}`),
          h("span", { class: "muted" }, "Перенести всі вибрані в тег:"),
          h(
            "div",
            { class: "bulk-tags" },
            g.tags.map((t) => [t.id, tagLabel(t.id)]).concat([["", "Без тегу"]]).map(([id, label]) => {
              const all = selPhotos.every((p) => (id ? (p.tags || [])[0] === id && p.tags.length === 1 : !(p.tags || []).length));
              return h(
                "button",
                {
                  class: "ptag big" + (all ? " on" : ""),
                  onclick: () => { selPhotos.forEach((p) => (p.tags = id ? [id] : [])); changed(); },
                },
                (all ? "✓ " : "") + label
              );
            })
          ),
          h(
            "div",
            { class: "bulk-actions" },
            h("button", { class: "btn btn-ghost btn-small", onclick: () => { sel.clear(); renderGallery(); } }, "Зняти виділення"),
            h("button", { class: "btn btn-ghost btn-small danger-ghost", onclick: () => askDelete(`${sel.size} вибраних фото`, () => { g.photos = g.photos.filter((p) => !sel.has(p.src)); sel.clear(); changed(); }) }, "Видалити вибрані")
          )
        )
      );
    }

    const grid = h("div", { class: "photos mode-" + mode });
    // new (not yet published) photos first with their own heading, then the ones already on the site
    const isNewP = (p) => !!state.pending[p.src];
    const newOnes = shown.filter(isNewP), oldOnes = shown.filter((p) => !isNewP(p));
    const ordered = newOnes.concat(oldOnes);
    const heading = (text, cls) => h("div", { class: "photos-heading " + cls }, text);
    if (newOnes.length) grid.appendChild(heading(`Нові фото · ${newOnes.length} — з'являться на сайті після «Опублікувати на сайті»`, "is-new"));
    ordered.forEach((p, i) => {
      if (newOnes.length && i === newOnes.length && oldOnes.length) grid.appendChild(heading(`Уже на сайті · ${oldOnes.length}`, "is-old"));
      p.tags = p.tags || [];
      const isSel = sel.has(p.src);
      grid.appendChild(
        h(
          "div",
          { class: "photo" + (isSel ? " selected" : ""), "data-dk": "gallery:" + p.src },
          h(
            "div",
            { class: "photo-img" },
            imgWithFallback(p.src),
            h(
              "label",
              { class: "photo-check", title: isSel ? "Зняти виділення" : "Виділити" },
              h("input", { type: "checkbox", checked: isSel, onchange: (e) => { if (e.target.checked) sel.add(p.src); else sel.delete(p.src); renderGallery(); } }),
              h("span", null, "✓")
            )
          ),
          h(
            "div",
            { class: "photo-body" },
            h(
              "label",
              { class: "photo-tagsel", title: "Тег цього фото" },
              h("span", null, "Тег"),
              select([["", "Без тегу"]].concat(g.tags.map((t) => [t.id, tagLabel(t.id)])), p.tags[0] || "", (v) => { p.tags = v ? [v] : []; changed(); })
            ),
            h(
              "div",
              { class: "photo-foot" },
              h(
                "button",
                {
                  class: "icon-btn",
                  title: "Редагувати фото (обрізати, наблизити, повернути)",
                  "aria-label": "Редагувати фото",
                  onclick: async () => {
                    const np = await reeditImage(p.src, "gallery", "");
                    if (np) { if (sel.delete(p.src)) sel.add(np); p.src = np; changed(); }
                  },
                },
                icon("edit")
              ),
              p.added ? h("span", { class: "photo-added", title: "Додано " + fmtAdded(p.added, true) }, "Додано " + fmtAdded(p.added)) : null,
              h("span", { class: "foot-gap" }),
              h(
                "button",
                {
                  class: "icon-btn danger",
                  title: "Видалити фото",
                  "aria-label": "Видалити фото",
                  onclick: () => askDelete("це фото з галереї", () => { g.photos = g.photos.filter((x) => x !== p); sel.delete(p.src); changed(); }),
                },
                "✕"
              )
            )
          )
        )
      );
    });
    if (!shown.length) grid.appendChild(h("p", { class: "muted" }, "Тут поки немає фото."));
    view.appendChild(grid);    if (!view._drop) { view._drop = true; dropTarget(view, (files) => state.tab === "gallery" && view._handle(files)); }
    view._handle = handleFiles;
    if (render._booted) markDrafts(); // keep draft marks after filter/selection redraws
  }

  // a photo counts as "new" for 24 hours after it was added
  function isFreshPhoto(p) {
    if (!p.added) return !!state.pending[p.src];
    return Date.now() - new Date(p.added).getTime() < 24 * 3600e3;
  }
  function fmtAdded(iso, long) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    if (long) return d.toLocaleString("uk-UA", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const date = d.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
    const time = d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" });
    return `${date} о ${time}`;
  }

  (function () {
    let n = 0;
    const isFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes("Files");
    window.addEventListener("dragenter", (e) => { if (isFiles(e)) { n++; document.body.classList.add("files-dragging"); } });
    window.addEventListener("dragleave", (e) => { if (isFiles(e) && --n <= 0) { n = 0; document.body.classList.remove("files-dragging"); } });
    window.addEventListener("dragover", (e) => { if (isFiles(e)) e.preventDefault(); });
    window.addEventListener("drop", (e) => { if (isFiles(e)) { e.preventDefault(); n = 0; document.body.classList.remove("files-dragging"); } });
  })();

  function editTag(tag) {
    const g = state.content.gallery;
    const isNew = !tag;
    const draft = isNew ? { id: "", label: { ru: "", en: "", pl: "" } } : clone(tag);
    draft.label = draft.label || {};
    openModal(
      h(
        "div",
        null,
        h("h3", null, isNew ? "Новий тег" : "Перейменувати тег"),
        h("div", { class: "grid3" }, LANGS.map(([l, L]) => field("Назва " + L, textInput(draft.label[l], (v) => (draft.label[l] = v))))),
        h("p", { class: "muted" }, "Назва показується на кнопці фільтра над галереєю."),
        h(
          "div",
          { class: "modal-actions" },
          h("button", { class: "btn btn-ghost", onclick: closeModal }, "Скасувати"),
          h(
            "button",
            {
              class: "btn btn-teal",
              onclick: () => {
                if (!(draft.label.ru || "").trim()) return toast("Вкажіть назву RU.", true);
                if (isNew) {
                  let id = slugify(draft.label.ru) || "tag";
                  let n = 2;
                  const base = id;
                  while (g.tags.some((x) => x.id === id) || id === "all") id = base + "-" + n++;
                  draft.id = id;
                  g.tags.push(draft);
                } else {
                  tag.label = draft.label;
                }
                closeModal();
                changed();
              },
            },
            "Готово"
          )
        )
      )
    );
  }


  // ── shared widgets for the "all cards" sections ──
  // Photo with upload / edit / remove. get() and set(path) read and write the photo path.
  function photoPicker(get, set, kind, baseName, title, hint, emoji) {
    const box = h("div", { class: "photo-pick" + (kind === "cert" ? " wide contain" : kind === "halls" ? " wide" : "") });
    function draw() {
      box.innerHTML = "";
      const cur = get();
      box.appendChild(cur ? imgWithFallback(cur) : h("div", { class: "ph" }, emoji || "🖼"));
      const input = h("input", { type: "file", accept: "image/*,.heic,.heif" });
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const p = await addPendingImage(file, kind, baseName(), 1600, title);
          input.value = "";
          if (p) { set(p); draw(); }
        } catch (e) {
          toast(e.message, true);
        }
      });
      box.appendChild(
        h(
          "div",
          null,
          h("span", { class: "btn btn-ghost btn-small file-btn" }, cur ? "Змінити фото" : "Завантажити фото", input),
          cur ? h("button", { class: "btn btn-ghost btn-small", type: "button", style: "margin-left:8px", onclick: async () => { const p = await reeditImage(cur, kind, baseName()); if (p) { set(p); draw(); } } }, "✎ Редагувати фото") : null,
          cur && emoji ? h("button", { class: "link", type: "button", style: "margin-left:10px", onclick: () => { set(""); draw(); } }, "прибрати") : null,
          hint ? h("p", { class: "muted", style: "margin-top:8px" }, hint) : null
        )
      );
    }
    draw();
    return box;
  }
  // Editable list of short texts in three languages, e.g. features, tags, conditions.
  // onChange is called after every edit (use updateSavebar for inline sections).
  function langList(arr, opts) {
    opts = opts || {};
    const box = h("div");
    const onChange = opts.onChange || (() => {});
    function draw() {
      box.innerHTML = "";
      if (arr.length) box.appendChild(h("div", { class: "multi-row tags multi-head" + (opts.wide ? " wide" : "") }, h("span", null, "RU"), h("span", null, "EN"), h("span", null, "PL"), h("span")));
      arr.forEach((item, i) => {
        box.appendChild(
          h(
            "div",
            { class: "multi-row tags" + (opts.wide ? " wide" : "") },
            LANGS.map(([l]) => textInput(item[l], (v) => { item[l] = v; onChange(); }, { placeholder: l.toUpperCase() })),
            h(
              "div",
              { class: "row-btns" },
              h("button", { class: "icon-btn", type: "button", title: "Вище", disabled: i === 0, onclick: () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; draw(); onChange(); } }, "↑"),
              h("button", { class: "icon-btn danger", type: "button", title: "Видалити", onclick: () => { arr.splice(i, 1); draw(); onChange(); } }, "✕")
            )
          )
        );
      });
      box.appendChild(h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { arr.push({ ru: "", en: "", pl: "" }); draw(); onChange(); const ins = box.querySelectorAll("input"); if (ins.length) ins[ins.length - 3].focus(); } }, opts.addLabel || "+ Додати"));
    }
    draw();
    return box;
  }
  // Text fields per language with RU / EN / PL switch. fields: [[key, label, "area"?]]
  function langFields(textObj, fields, onChange) {
    let lang = "ru";
    LANGS.forEach(([l]) => (textObj[l] = textObj[l] || {}));
    const box = h("div");
    function draw() {
      const d = textObj[lang];
      box.innerHTML = "";
      fields.forEach(([key, label, kind]) => {
        const inp =
          kind === "area"
            ? h("textarea", { oninput: (e) => { d[key] = e.target.value; onChange(); } }, d[key] || "")
            : textInput(d[key], (v) => { d[key] = v; onChange(); });
        box.appendChild(field(label + (lang === "ru" ? "" : " (" + lang.toUpperCase() + ")"), inp));
      });
    }
    draw();
    return h("div", null, langTabs((l) => { lang = l; draw(); }, lang), box);
  }
  function previewBtn(section) {
    return h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => preview(section) }, "👁 Переглянути на сайті");
  }
  // keep only rows with any text; tiny helper for clean data
  const anyText = (o) => !!(o && LANGS.some(([l]) => (o[l] || "").trim()));

  // ── HALLS (оренда залів) ──
  function emptyRoom() {
    const text = {};
    LANGS.forEach(([l]) => (text[l] = { name: "", badge: "", desc: "" }));
    return { id: "h" + Date.now().toString(36), photo: "", sqm: "", emoji: "🎵", text, features: [], bookUrl: ENROLL_DEFAULT };
  }
  function renderHalls() {
    const view = $("hallsView");
    view.innerHTML = "";
    const H = (state.content.halls = state.content.halls || {});
    H.rooms = H.rooms || [];
    H.prices = H.prices || [];
    H.conditions = H.conditions || [];
    H.intro = H.intro || { ru: "", en: "", pl: "" };
    view.appendChild(
      h("div", { class: "view-head" }, h("div", null, h("div", { class: "chip" }, "Аренда залов"), h("h2", null, "Зали")), h("div", { class: "head-actions" }, h("p", { class: "muted" }, "Порядок тут такий самий, як на сайті."), previewBtn("halls")))
    );

    // intro text under the title
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Текст під заголовком")),
        h("div", { class: "grid3" }, LANGS.map(([l, L]) => field(L, h("textarea", { class: "short", oninput: (e) => { H.intro[l] = e.target.value; updateSavebar(); } }, H.intro[l] || ""))))
      )
    );

    // rooms
    const rows = h("div", { class: "row-list" });
    H.rooms.forEach((r, i) => {
      const ru = (r.text && r.text.ru) || {};
      rows.appendChild(
        h(
          "div",
          { class: "trow wide-img" + (r.hidden ? " is-hidden" : ""), "data-dk": "rooms:" + r.id },
          dragHandle(),
          r.photo ? imgWithFallback(r.photo) : h("div", { class: "ph" }, r.emoji || "🎵"),
          h(
            "div",
            null,
            h("div", { class: "trow-name" }, ru.name || "(без назви)", r.sqm ? h("span", { class: "badge basic" }, r.sqm + " m²") : null, r.hidden ? h("span", { class: "badge off" }, "приховано") : null),
            h("div", { class: "trow-role" }, ru.badge || "")
          ),
          h(
            "div",
            { class: "trow-actions" },
            h("button", { class: "icon-btn act", title: "Редагувати", "aria-label": "Редагувати", onclick: () => editRoom(i) }, icon("edit")),
            h("button", { class: "icon-btn act", title: r.hidden ? "Показати на сайті" : "Сховати з сайту", "aria-label": r.hidden ? "Показати" : "Сховати", onclick: () => { r.hidden = !r.hidden; changed(); } }, icon(r.hidden ? "eyeOff" : "eye")),
            h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => askDelete(`зал «${ru.name || "без назви"}»`, () => { H.rooms.splice(i, 1); changed(); }) }, "✕")
          )
        )
      );
    });
    if (!H.rooms.length) rows.appendChild(h("p", { class: "muted" }, "Поки немає залів."));
    sortable(rows, ".trow", (from, to) => { moveItem(H.rooms, from, to); changed(); });
    view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, "Картки залів"), h("button", { class: "btn btn-teal btn-small", onclick: () => editRoom(-1) }, "+ Додати зал")), rows));

    // rent prices
    const grid = h("div", { class: "plans hp-plans" });
    H.prices.forEach((p, i) => {
      p.title = p.title || {};
      p.unit = p.unit || {};
      grid.appendChild(
        h(
          "div",
          { class: "plan" + (p.hidden ? " is-hidden" : ""), "data-dk": "hallprices:" + i },
          h(
            "div",
            { class: "plan-head" },
            h("div", null, h("span", { class: "plan-title" }, (p.title.ru || "Нова ціна") + " · " + (p.price || 0) + " zł"), p.featured ? h("span", { class: "badge top" }, "виділена") : null, p.hidden ? h("span", { class: "badge off" }, "приховано") : null),
            h(
              "div",
              { class: "trow-actions" },
              dragHandle(),
              h("button", { class: "icon-btn", title: p.hidden ? "Показати" : "Сховати", onclick: () => { p.hidden = !p.hidden; changed(); } }, p.hidden ? "◌" : "◉"),
              h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => askDelete(`ціну оренди «${(p.title && p.title.ru) || ""}»`, () => { H.prices.splice(i, 1); changed(); }) }, "✕")
            )
          ),
          h(
            "div",
            { class: "grid2" },
            field("Ціна, zł", numInput(p.price, (v) => { p.price = v; updateSavebar(); })),
            h("label", { class: "check", style: "align-self:end;margin-bottom:10px" }, h("input", { type: "checkbox", checked: !!p.featured, onchange: (e) => { p.featured = e.target.checked; changed(); } }), "Виділити (бірюзова рамка)")
          ),
          h("div", { class: "grid3" }, LANGS.map(([l, L]) => field("Назва " + L, textInput(p.title[l], (v) => { p.title[l] = v; updateSavebar(); }, { placeholder: l === "ru" ? "Абонемент S · 4 ч" : "" })))),
          h("div", { class: "grid3" }, LANGS.map(([l, L]) => field("Підпис " + L, textInput(p.unit[l], (v) => { p.unit[l] = v; updateSavebar(); }, { placeholder: l === "ru" ? "65 zł / час" : "" }))))
        )
      );
    });
    sortable(grid, ".plan", (from, to) => { moveItem(H.prices, from, to); changed(); });
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Ціни оренди"), h("button", { class: "btn btn-teal btn-small", onclick: () => { H.prices.push({ title: { ru: "", en: "", pl: "" }, price: 0, unit: { ru: "", en: "", pl: "" }, featured: false }); changed(); } }, "+ Додати ціну")),
        grid
      )
    );

    // conditions
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Умови оренди (список під цінами)")),
        langList(H.conditions, { wide: true, addLabel: "+ Додати умову", onChange: updateSavebar })
      )
    );
  }

  function editRoom(index) {
    modalKey = index >= 0 ? lastCardKey : null;
    const H = state.content.halls;
    const isNew = index < 0;
    const r = isNew ? emptyRoom() : clone(H.rooms[index]);
    r.text = r.text || {};
    LANGS.forEach(([l]) => (r.text[l] = Object.assign({ name: "", badge: "", desc: "" }, r.text[l] || {})));
    r.features = r.features || [];
    const base = () => slugify(r.text.ru.name) || "hall";
    const node = h(
      "div",
      null,
      h("h3", null, isNew ? "Новий зал" : "Редагування залу"),
      h("div", { class: "sub-head" }, "Фото"),
      photoPicker(() => r.photo, (p) => (r.photo = p), "halls", base, "Фото залу", "Горизонтальне фото. На картці воно показується смугою 3:1.", r.emoji || "🎵"),
      h("div", { class: "grid2" }, field("Площа, m²", textInput(r.sqm, (v) => (r.sqm = v.trim()), { placeholder: "20" })), field("Емодзі, якщо немає фото", textInput(r.emoji, (v) => (r.emoji = v)))),
      h("div", { class: "sub-head" }, "Тексти"),
      langFields(r.text, [["name", "Назва"], ["badge", "Підзаголовок (бірюзовий)"], ["desc", "Опис", "area"]], () => {}),
      h("div", { class: "sub-head" }, "Що є в залі (плашки)"),
      langList(r.features, { addLabel: "+ Додати плашку" }),
      field("Куди веде кнопка «Забронировать зал» (#contact = розділ «Контакти»)", textInput(r.bookUrl || ENROLL_DEFAULT, (v) => (r.bookUrl = v.trim()))),
      editorActions(() => {
        if (!r.text.ru.name.trim()) return toast("Вкажіть назву російською (RU), це основна мова сайту.", true), false;
        r.features = r.features.filter(anyText);
        if (isNew) H.rooms.push(r);
        else H.rooms[index] = r;
        return true;
      }, () => "halls")
    );
    openModal(node);
  }

  // ── ABOUT (блок засновниці «О студии») ──
  function renderAbout() {
    const view = $("aboutView");
    view.innerHTML = "";
    const F = (state.content.founder = state.content.founder || { photo: "", text: {}, stats: [], tags: [], videos: [] });
    F.text = F.text || {};
    F.stats = F.stats || [];
    F.tags = F.tags || [];
    F.videos = F.videos || [];
    view.appendChild(h("div", { class: "view-head" }, h("div", null, h("div", { class: "chip" }, "О студии"), h("h2", null, "Про студію")), h("div", { class: "head-actions" }, previewBtn("founder"))));

    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Фото і підпис на фото")),
        photoPicker(() => F.photo, (p) => { F.photo = p; changed(); }, "about", () => "founder", "Фото засновниці", "Вертикальне фото. На сайті видно верхню частину."),
        langFields(F.text, [["badgeTitle", "Маленький напис (бірюзовий)"], ["badgeVal", "Підпис під ним"]], updateSavebar)
      )
    );
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Заголовок і текст")),
        langFields(F.text, [["title", "Заголовок, перший рядок"], ["titleEm", "Заголовок, другий рядок (бірюзовий курсив)"], ["p1", "Абзац 1", "area"], ["p2", "Абзац 2", "area"], ["p3", "Абзац 3", "area"]], updateSavebar)
      )
    );

    // stats
    const statsBox = h("div");
    (function drawStats() {
      statsBox.innerHTML = "";
      if (F.stats.length) statsBox.appendChild(h("div", { class: "multi-row stats multi-head" }, h("span", null, "Число"), h("span", null, "Підпис RU"), h("span", null, "EN"), h("span", null, "PL"), h("span", null, "Золотий"), h("span")));
      F.stats.forEach((st, i) => {
        st.label = st.label || {};
        statsBox.appendChild(
          h(
            "div",
            { class: "multi-row stats" },
            textInput(st.num, (v) => { st.num = v; updateSavebar(); }, { placeholder: "500+" }),
            LANGS.map(([l]) => textInput(st.label[l], (v) => { st.label[l] = v; updateSavebar(); }, { placeholder: l.toUpperCase() })),
            h("input", { type: "checkbox", checked: !!st.gold, title: "Золотий колір числа", onchange: (e) => { st.gold = e.target.checked; updateSavebar(); } }),
            h("button", { class: "icon-btn danger", type: "button", title: "Видалити", onclick: () => { F.stats.splice(i, 1); drawStats(); updateSavebar(); } }, "✕")
          )
        );
      });
      statsBox.appendChild(h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { F.stats.push({ num: "", label: { ru: "", en: "", pl: "" } }); drawStats(); updateSavebar(); } }, "+ Додати число"));
    })();
    view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, "Цифри (5+, 20+, 500+)")), statsBox));

    view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, "Жанри (плашки)")), langList(F.tags, { addLabel: "+ Додати жанр", onChange: updateSavebar })));

    // videos
    const vidBox = h("div");
    (function drawVideos() {
      vidBox.innerHTML = "";
      if (F.videos.length) vidBox.appendChild(h("div", { class: "multi-row videos multi-head" }, h("span", null, "Посилання (YouTube)"), h("span", null, "Назва RU"), h("span", null, "EN"), h("span", null, "PL"), h("span")));
      F.videos.forEach((v, i) => {
        v.label = v.label || {};
        vidBox.appendChild(
          h(
            "div",
            { class: "multi-row videos" },
            textInput(v.url, (x) => { v.url = x.trim(); updateSavebar(); }, { placeholder: "https://youtube.com/…" }),
            LANGS.map(([l]) => textInput(v.label[l], (x) => { v.label[l] = x; updateSavebar(); }, { placeholder: "Назва " + l.toUpperCase() })),
            h("button", { class: "icon-btn danger", type: "button", title: "Видалити відео", onclick: () => { F.videos.splice(i, 1); drawVideos(); updateSavebar(); } }, "✕")
          )
        );
      });
      vidBox.appendChild(h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => { F.videos.push({ url: "", label: { ru: "Видео", en: "Video", pl: "Wideo" } }); drawVideos(); updateSavebar(); } }, "+ Додати відео"));
    })();
    view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, "Відео (кнопки ▶)")), vidBox));
  }

  // ── CERTIFICATE ──
  function renderCert() {
    const view = $("certView");
    view.innerHTML = "";
    const G = (state.content.cert = state.content.cert || { image: "", price: "", currency: "PLN", text: {} });
    G.text = G.text || {};
    view.appendChild(h("div", { class: "view-head" }, h("div", null, h("div", { class: "chip" }, "Подарок"), h("h2", null, "Сертифікат")), h("div", { class: "head-actions" }, previewBtn("cert"))));
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Картинка сертифіката")),
        photoPicker(() => G.image, (p) => { G.image = p; changed(); }, "cert", () => "certificate", "Картинка сертифіката", "Показується повністю, без обрізання.")
      )
    );
    view.appendChild(
      h(
        "div",
        { class: "group" },
        h("div", { class: "group-head" }, h("h3", null, "Ціна і текст")),
        h("div", { class: "grid2" }, field("Ціна «от …»", textInput(G.price, (v) => { G.price = v.trim(); updateSavebar(); }, { placeholder: "120" })), field("Валюта", textInput(G.currency, (v) => { G.currency = v.trim(); updateSavebar(); }, { placeholder: "PLN" }))),
        langFields(G.text, [["p1", "Абзац 1", "area"], ["p2", "Абзац 2", "area"]], updateSavebar)
      )
    );
  }

  // ── EVENTS (афіша і банер) ──
  // Dates are strings "YYYY-MM-DDTHH:mm" in Warsaw time, the same way the site reads them.
  const TZ = "Europe/Warsaw";
  function warsawTime(str) {
    if (!str) return NaN;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(str);
    if (!m) return NaN;
    const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
    const p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(asUtc))
      .forEach((x) => (p[x.type] = x.value));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    return asUtc - (shown - asUtc);
  }
  function toWarsawStr(ts) {
    const p = {};
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(ts))
      .forEach((x) => (p[x.type] = x.value));
    return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
  }
  function eventEnd(e) {
    if (e.endDate) return warsawTime(e.endDate);
    return e.date ? warsawTime(e.date.slice(0, 10) + "T23:59") + 59000 : NaN;
  }
  function showFrom(e) {
    return e.publishFrom ? warsawTime(e.publishFrom) : -Infinity;
  }
  function showUntil(e) {
    return e.publishUntil ? warsawTime(e.publishUntil) : eventEnd(e);
  }
  // draft | scheduled | live | ended
  function eventStatus(e, now) {
    now = now || Date.now();
    if (e.hidden || !e.date) return "draft";
    if (now < showFrom(e)) return "scheduled";
    if (now >= showUntil(e)) return "ended";
    return "live";
  }
  const STATUS = {
    live: ["На сайті зараз", "live"],
    scheduled: ["Заплановано", "scheduled"],
    draft: ["Чернетка", "draft"],
    ended: ["Завершено", "ended"],
  };
  function nice(ts, withYear) {
    if (!isFinite(ts)) return "";
    return new Intl.DateTimeFormat("uk-UA", { timeZone: TZ, day: "numeric", month: "long", year: withYear ? "numeric" : undefined, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ts));
  }
  function niceDate(str) {
    if (!str) return "дата не вказана";
    const ts = warsawTime(str);
    return new Intl.DateTimeFormat("uk-UA", { timeZone: TZ, weekday: "short", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(ts));
  }
  function scheduleText(e) {
    if (e.hidden) return "Чернетка: на сайті не показується, поки ви не вимкнете цю позначку.";
    if (!e.date) return "Вкажіть дату події.";
    const from = e.publishFrom ? "з " + nice(warsawTime(e.publishFrom), true) : "одразу після публікації";
    const until = isFinite(showUntil(e)) ? "до " + nice(showUntil(e), true) : "";
    const late = e.publishUntil && showUntil(e) > eventEnd(e) + 3600000 ? " Увага: подія вже пройде, а картка ще буде на сайті." : "";
    return `На сайті ${from} ${until}${e.publishUntil ? "" : " (коли подія закінчиться)"}.` + (e.banner ? " Весь цей час банер вискакує при відкритті сайту." : "") + late;
  }

  function emptyEvent() {
    const text = {};
    LANGS.forEach(([l]) => (text[l] = { title: "", place: "", desc: "", button: "" }));
    text.ru.place = "Lina's Music Studio, Warszawa";
    return { id: "e" + Date.now().toString(36), date: "", endDate: "", image: "", text, buttonUrl: ENROLL_DEFAULT, banner: false, publishFrom: "", publishUntil: "", hidden: false };
  }

  function renderEvents() {
    const view = $("eventsView");
    view.innerHTML = "";
    const events = (state.content.events = state.content.events || []);
    const now = Date.now();
    view.appendChild(
      h(
        "div",
        { class: "view-head" },
        h("div", null, h("div", { class: "chip" }, "Афіша"), h("h2", null, "Події")),
        h("button", { class: "btn btn-teal", onclick: () => editEvent(-1) }, "+ Додати подію")
      )
    );
    view.appendChild(
      h(
        "p",
        { class: "muted ev-help" },
        "Події показуються на сайті в розділі «Афіша». Позначте ★ «Банер», щоб подія вискакувала великим вікном, коли людина відкриває сайт. Сайт сам вмикає і вимикає подію в указаний час. Після змін натисніть «Опублікувати на сайті» внизу."
      )
    );
    const order = ["pending", "live", "scheduled", "draft", "ended"];
    const titles = { pending: "Нові, ще не опубліковані", live: "Зараз на сайті", scheduled: "Заплановані (з'являться самі)", draft: "Чернетки (приховані)", ended: "Архів минулих подій" };
    const onSite = new Set((state.original.events || []).filter((o) => eventStatus(o, now) === "live").map((o) => o.id));
    const items = events.map((e, i) => {
      let st = eventStatus(e, now);
      if (st === "live" && !onSite.has(e.id)) st = "pending";
      return { e, i, s: st };
    });
    if (!items.length) {
      view.appendChild(
        h("div", { class: "ev-empty" }, h("div", { class: "ev-empty-icon" }, "🎤"), h("p", null, "Поки немає жодної події."), h("button", { class: "btn btn-teal", onclick: () => editEvent(-1) }, "+ Додати першу подію"))
      );
      return;
    }
    order.forEach((s) => {
      const list = items.filter((x) => x.s === s).sort((a, b) => (s === "ended" ? -1 : 1) * (warsawTime(a.e.date) - warsawTime(b.e.date)));
      if (!list.length) return;
      const rows = h("div", { class: "row-list" });
      list.forEach(({ e, i }) => {
        const ru = (e.text && e.text.ru) || {};
        rows.appendChild(
          h(
            "div",
            { class: "trow evrow st-" + s, "data-dk": "events:" + e.id },
            e.image ? imgWithFallback(e.image) : h("div", { class: "ph" }, "🎤"),
            h(
              "div",
              null,
              h(
                "div",
                { class: "trow-name" },
                ru.title || "(без назви)"
              ),
              h("div", { class: "trow-badges" },
                h("span", { class: "badge st " + (s === "pending" ? "pending" : STATUS[s][1]) }, s === "scheduled" ? "⏰ Заплановано" : s === "pending" ? "Ще не на сайті" : STATUS[s][0]),
                e.banner ? h("span", { class: "badge star" }, "★ Банер") : null
              ),
              s === "scheduled" ? h("div", { class: "ev-appears" }, icon("clock"), h("span", null, "З'явиться на сайті ", h("b", null, nice(showFrom(e))))) : null,
              s === "pending" ? h("div", { class: "ev-appears pending" }, icon("clock"), h("span", null, "З'явиться на сайті ", h("b", null, "одразу після публікації"))) : null,
              h("div", { class: "trow-role" }, "🗓 " + niceDate(e.date)),
              h("div", { class: "ev-sched" }, scheduleText(e))
            ),
            h(
              "div",
              { class: "trow-actions" },
              h("button", { class: "icon-btn act", title: "Редагувати", "aria-label": "Редагувати", onclick: () => editEvent(i) }, icon("edit")),
              h("button", { class: "icon-btn act", "aria-label": "Копіювати", title: "Копіювати (наприклад, для наступного такого ж івенту)", onclick: () => { const c = clone(e); c.id = "e" + Date.now().toString(36); c.hidden = true; events.push(c); changed(); toast("Копію створено як чернетку."); } }, icon("copy")),
              h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => askDelete(`подію «${ru.title || "без назви"}»`, () => { events.splice(i, 1); changed(); }) }, "✕")
            )
          )
        );
      });
      if (s === "ended") {
        const det = h("details", { class: "group ev-archive" },
          h("summary", null, h("h3", null, titles[s], h("span", { class: "count-pill" }, String(list.length))), h("span", { class: "muted" }, "Вже не показуються на сайті. Натисніть, щоб відкрити.")),
          rows);
        if (state.archiveOpen) det.open = true;
        det.addEventListener("toggle", () => (state.archiveOpen = det.open));
        view.appendChild(det);
        return;
      }
      view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, titles[s], h("span", { class: "count-pill" }, String(list.length)))), rows));
    });
  }

  function editEvent(index) {
    modalKey = index >= 0 ? lastCardKey : null;
    const isNew = index < 0;
    const e = isNew ? emptyEvent() : clone(state.content.events[index]);
    e.text = e.text || {};
    LANGS.forEach(([l]) => (e.text[l] = Object.assign({ title: "", place: "", desc: "", button: "" }, e.text[l] || {})));
    let lang = "ru";

    const photoBox = h("div", { class: "photo-pick wide" });
    function drawPhoto() {
      photoBox.innerHTML = "";
      photoBox.appendChild(e.image ? imgWithFallback(e.image) : h("div", { class: "ph" }, "🎤"));
      const input = h("input", { type: "file", accept: "image/*,.heic,.heif" });
      input.addEventListener("change", async () => {
        const file = input.files[0];
        if (!file) return;
        try {
          const p = await addPendingImage(file, "events", slugify(e.text.ru.title) || "event", 1600, "Фото / афіша події");
          input.value = "";
          if (p) { e.image = p; drawPhoto(); }
        } catch (err) {
          toast(err.message, true);
        }
      });
      photoBox.appendChild(
        h(
          "div",
          null,
          h("span", { class: "btn btn-ghost btn-small file-btn" }, e.image ? "Змінити фото / афішу" : "Завантажити фото / афішу", input),
          e.image ? h("button", { class: "btn btn-ghost btn-small", type: "button", style: "margin-left:8px", onclick: async () => { const p = await reeditImage(e.image, "events", slugify(e.text.ru.title) || "event"); if (p) { e.image = p; drawPhoto(); } } }, "✎ Редагувати фото") : null,
          e.image ? h("button", { class: "link", type: "button", style: "margin-left:10px", onclick: () => { e.image = ""; drawPhoto(); } }, "прибрати") : null,
          h("p", { class: "muted", style: "margin-top:8px" }, "Краще горизонтальне фото. Без фото буде красивий фон з мікрофоном.")
        )
      );
    }
    drawPhoto();

    const textBox = h("div");
    function drawText() {
      const d = e.text[lang];
      textBox.innerHTML = "";
      textBox.appendChild(
        h(
          "div",
          null,
          field("Назва події", textInput(d.title, (v) => (d.title = v), { placeholder: "Новорічний концерт учнів" })),
          field("Місце", textInput(d.place, (v) => (d.place = v), { placeholder: "Lina's Music Studio, Warszawa" })),
          field("Опис", h("textarea", { oninput: (ev) => (d.desc = ev.target.value), placeholder: "Коротко: що буде, для кого, скільки коштує вхід" }, d.desc)),
          field("Текст кнопки (необов'язково)", textInput(d.button, (v) => (d.button = v), { placeholder: lang === "ru" ? "Хочу пойти" : lang === "en" ? "I want to go" : "Chcę przyjść" }))
        )
      );
    }
    drawText();

    const summary = h("div", { class: "ev-summary" });
    function drawSummary() {
      summary.textContent = scheduleText(e);
      summary.className = "ev-summary st-" + eventStatus(e);
    }

    // banner toggle
    const bannerBox = h("label", { class: "big-toggle" + (e.banner ? " on" : "") });
    const bannerInput = h("input", { type: "checkbox", checked: e.banner, onchange: (ev) => { e.banner = ev.target.checked; bannerBox.classList.toggle("on", e.banner); drawSummary(); } });
    bannerBox.append(bannerInput, h("span", { class: "big-toggle-ui" }), h("span", null, h("b", null, "★ Головна подія: банер при відкритті сайту"), h("small", null, "Велике вікно з цією подією вискакує, коли людина заходить на сайт, і зверху сайту з'являється яскрава стрічка.")));

    // date fields
    const dateInput = h("input", { type: "datetime-local", value: e.date, oninput: (ev) => { e.date = ev.target.value; drawSummary(); } });
    const endInput = h("input", { type: "datetime-local", value: e.endDate, oninput: (ev) => { e.endDate = ev.target.value; drawSummary(); } });

    // publish from
    const fromBox = h("div", { class: "choice" });
    function drawFrom() {
      fromBox.innerHTML = "";
      const now = !e.publishFrom;
      fromBox.append(
        h("button", { type: "button", class: "choice-btn" + (now ? " on" : ""), onclick: () => { e.publishFrom = ""; drawFrom(); drawSummary(); } }, "Одразу"),
        h("button", { type: "button", class: "choice-btn" + (!now ? " on" : ""), onclick: () => { if (!e.publishFrom) e.publishFrom = toWarsawStr(Date.now() + 86400000).slice(0, 11) + "10:00"; drawFrom(); drawSummary(); } }, "З дати…"),
        !now ? h("input", { type: "datetime-local", value: e.publishFrom, oninput: (ev) => { e.publishFrom = ev.target.value; drawSummary(); } }) : null
      );
    }
    drawFrom();

    // publish until
    const untilBox = h("div", { class: "choice" });
    function quick(days) {
      const base = e.publishFrom ? warsawTime(e.publishFrom) : Date.now();
      e.publishUntil = toWarsawStr(base + days * 86400000);
      drawUntil();
      drawSummary();
    }
    function drawUntil() {
      untilBox.innerHTML = "";
      const auto = !e.publishUntil;
      untilBox.append(
        h("button", { type: "button", class: "choice-btn" + (auto ? " on" : ""), onclick: () => { e.publishUntil = ""; drawUntil(); drawSummary(); } }, "До кінця події"),
        h("button", { type: "button", class: "choice-btn", onclick: () => quick(7) }, "1 тиждень"),
        h("button", { type: "button", class: "choice-btn", onclick: () => quick(14) }, "2 тижні"),
        h("button", { type: "button", class: "choice-btn", onclick: () => quick(30) }, "1 місяць"),
        h("button", { type: "button", class: "choice-btn" + (!auto ? " on" : ""), onclick: () => { if (!e.publishUntil) quick(7); } }, "До дати…"),
        !auto ? h("input", { type: "datetime-local", value: e.publishUntil, oninput: (ev) => { e.publishUntil = ev.target.value; drawSummary(); } }) : null
      );
    }
    drawUntil();

    const draftBox = h("label", { class: "check" }, h("input", { type: "checkbox", checked: e.hidden, onchange: (ev) => { e.hidden = ev.target.checked; drawSummary(); } }), h("span", null, "Чернетка: поки не показувати на сайті"));
    drawSummary();

    const node = h(
      "div",
      null,
      h("h3", null, isNew ? "Нова подія" : "Редагування події"),
      bannerBox,
      h("div", { class: "sub-head" }, "Коли подія"),
      h("div", { class: "grid2" }, field("Початок (дата і час)", dateInput), field("Кінець (необов'язково)", endInput)),
      h("div", { class: "sub-head" }, "Фото"),
      photoBox,
      h("div", { class: "sub-head" }, "Тексти"),
      langTabs((l) => { lang = l; drawText(); }, lang),
      textBox,
      field("Куди веде кнопка (#contact = розділ «Контакти»; або посилання на квитки)", textInput(e.buttonUrl, (v) => (e.buttonUrl = v.trim()), { placeholder: "#contact" })),
      h("div", { class: "sub-head" }, "Публікація на сайті"),
      h("div", { class: "field" }, h("span", null, "Коли показати на сайті"), fromBox),
      h("div", { class: "field" }, h("span", null, "Скільки показувати"), untilBox),
      draftBox,
      summary,
      editorActions(() => {
        const bad = (msg) => (toast(msg, true), false);
        if (!e.text.ru.title.trim()) return bad("Вкажіть назву російською (RU), це основна мова сайту.");
        if (!e.date) return bad("Вкажіть дату і час початку події.");
        if (e.endDate && warsawTime(e.endDate) < warsawTime(e.date)) return bad("Кінець події раніше за початок.");
        if (e.publishFrom && e.publishUntil && warsawTime(e.publishUntil) <= warsawTime(e.publishFrom)) return bad("«Показувати до» має бути пізніше, ніж «Показати з».");
        if (isNew) state.content.events.push(e);
        else state.content.events[index] = e;
        if (eventStatus(e) === "ended") setTimeout(() => toast("Увага: за цими датами подія вже не показується на сайті.", true), 50);
        else if (eventStatus(e) === "live") setTimeout(() => toast("Збережено. Подія з'явиться на сайті одразу після «Опублікувати на сайті». Щоб вона з'явилась пізніше, у полі «Показати на сайті» оберіть «З дати…»."), 50);
        else if (eventStatus(e) === "scheduled") setTimeout(() => toast("Подію заплановано: вона з'явиться на сайті " + nice(showFrom(e)) + ". Не забудьте натиснути «Опублікувати на сайті», щоб розклад запрацював."), 50);
        return true;
      }, () => "afisha")
    );
    openModal(node);
  }


  // ── which cards are still a draft (changed or new, not on the site yet) ──
  function draftItem(c, key) {
    const [kind, a, b] = key.split(":");
    const rest = key.slice(kind.length + 1);
    if (!c) return undefined;
    if (kind === "teachers") return (c.teachers || []).find((x) => String(x.id) === rest);
    if (kind === "events") return (c.events || []).find((x) => String(x.id) === rest);
    if (kind === "rooms") return ((c.halls && c.halls.rooms) || []).find((x) => String(x.id) === rest);
    if (kind === "gallery") return ((c.gallery && c.gallery.photos) || []).find((x) => x.src === rest);
    if (kind === "plans") return ((c.prices && c.prices[a]) || [])[+b];
    if (kind === "hallprices") return ((c.halls && c.halls.prices) || [])[+a];
    return undefined;
  }
  function markDrafts() {
    if (!state.content || !state.original) return;
    document.querySelectorAll("[data-dk]").forEach((el) => {
      const key = el.getAttribute("data-dk");
      const cur = draftItem(state.content, key);
      const old = draftItem(state.original, key);
      const st = !cur ? "" : old === undefined ? "new" : JSON.stringify(cur) !== JSON.stringify(old) ? "changed" : "";
      const unsaved = !!st && (state.draftKeys || []).includes(key);
      el.classList.toggle("has-draft", !!st);
      el.classList.toggle("is-unsaved", unsaved);
      if (st) el.setAttribute("data-draft", unsaved ? (st === "new" ? "Нова · чернетка, не збережено" : "Чернетка · не збережено") : st === "new" ? "Нова · чекає публікації" : "Збережено · чекає публікації");
      else el.removeAttribute("data-draft");
    });
    const changedT = changedTabs();
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("has-draft", changedT.includes(b.dataset.tab)));
    ALL_TABS.forEach((t) => {
      const view = $(t + "View");
      if (!view) return;
      let note = view.querySelector(":scope > .view-draft-note");
      if (changedT.includes(t)) {
        if (!note) {
          note = h("div", { class: "view-draft-note" }, h("span", { class: "sp-dot" }),
            h("span", null, h("b", null, "У цьому розділі є неопубліковані зміни. "), "Бірюзова мітка: збережено й чекає публікації. Жовта: чернетка, з якої ви вийшли без збереження. Відвідувачі сайту поки не бачать жодної з них."));
          const head = view.querySelector(":scope > .view-head");
          if (head) head.after(note); else view.prepend(note);
        }
      } else if (note) note.remove();
    });
  }

  // ── review before publishing: what exactly changed ──
  function ruName(o, field) {
    const t = (o && o.text && o.text.ru) || {};
    return t[field] || (o && o.title && o.title.ru) || "";
  }
  function diffList(cur, old, keyFn, nameFn) {
    cur = cur || []; old = old || [];
    const out = [];
    const oldMap = new Map(old.map((x, i) => [keyFn(x, i), x]));
    const curKeys = new Set();
    cur.forEach((x, i) => {
      const k = keyFn(x, i);
      curKeys.add(k);
      const o = oldMap.get(k);
      if (!o) out.push(["new", nameFn(x)]);
      else if (JSON.stringify(o) !== JSON.stringify(x)) {
        const hid = !!x.hidden !== !!o.hidden ? (x.hidden ? " (сховано з сайту)" : " (знову показано)") : "";
        out.push(["changed", nameFn(x) + hid]);
      }
    });
    old.forEach((x, i) => { if (!curKeys.has(keyFn(x, i))) out.push(["deleted", nameFn(x)]); });
    const oldOrder = old.map(keyFn).filter((k) => curKeys.has(k)).join("|");
    const curOrder = cur.map(keyFn).filter((k) => oldMap.has(k)).join("|");
    if (oldOrder !== curOrder) out.push(["changed", "змінено порядок карток"]);
    return out;
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function changeSummary() {
    const c = state.content, o = state.original;
    const res = [];
    const add = (tab, lines) => { if (lines.length) res.push({ tab, lines }); };
    add("events", diffList(c.events, o.events, (x) => x.id, (x) => "Подія «" + (ruName(x, "title") || "без назви") + "»"));
    add("teachers", diffList(c.teachers, o.teachers, (x) => x.id, (x) => "Викладач " + (ruName(x, "name") || "без імені")));
    const pl = [];
    ["vocal", "instruments"].forEach((g) => {
      const label = g === "vocal" ? "Вокал" : "Інструменти";
      diffList((c.prices || {})[g], (o.prices || {})[g], (x, i) => i, (x) => label + ": картка «" + ((x.title && x.title.ru) || "") + (x.badge ? " " + x.badge : "") + "»").forEach((l) => pl.push(l));
    });
    add("prices", pl);
    const H = c.halls || {}, HO = o.halls || {};
    const hl = [];
    if (!same(H.intro, HO.intro)) hl.push(["changed", "Текст під заголовком «Оренда залів»"]);
    diffList(H.rooms, HO.rooms, (x) => x.id, (x) => "Зал «" + (ruName(x, "name") || "без назви") + "»").forEach((l) => hl.push(l));
    diffList(H.prices, HO.prices, (x, i) => i, (x) => "Ціна оренди «" + ((x.title && x.title.ru) || "") + "»").forEach((l) => hl.push(l));
    if (!same(H.conditions, HO.conditions)) hl.push(["changed", "Умови оренди"]);
    add("halls", hl);
    const F = c.founder || {}, FO = o.founder || {};
    const fl = [];
    if (F.photo !== FO.photo) fl.push(["changed", "Фото засновниці"]);
    if (!same(F.text, FO.text)) fl.push(["changed", "Тексти блоку «Про студію»"]);
    if (!same(F.stats, FO.stats)) fl.push(["changed", "Цифри (досягнення)"]);
    if (!same(F.tags, FO.tags)) fl.push(["changed", "Теги"]);
    if (!same(F.videos, FO.videos)) fl.push(["changed", "Відео"]);
    add("about", fl);
    const C = c.cert || {}, CO = o.cert || {};
    const cl = [];
    if (C.image !== CO.image) cl.push(["changed", "Фото сертифіката"]);
    if (C.price !== CO.price || C.currency !== CO.currency) cl.push(["changed", "Ціна: " + (C.price || "") + " " + (C.currency || "")]);
    if (!same(C.text, CO.text)) cl.push(["changed", "Тексти сертифіката"]);
    add("cert", cl);
    const G = c.gallery || {}, GO = o.gallery || {};
    const gl = [];
    const curSrc = new Set((G.photos || []).map((x) => x.src)), oldSrc = new Set((GO.photos || []).map((x) => x.src));
    const addedN = [...curSrc].filter((x) => !oldSrc.has(x)).length, delN = [...oldSrc].filter((x) => !curSrc.has(x)).length;
    const oldBySrc = new Map((GO.photos || []).map((x) => [x.src, x]));
    const tagN = (G.photos || []).filter((x) => oldBySrc.has(x.src) && !same(x, oldBySrc.get(x.src))).length;
    if (addedN) gl.push(["new", "Додано фото: " + addedN]);
    if (delN) gl.push(["deleted", "Видалено фото: " + delN]);
    if (tagN) gl.push(["changed", "Змінено теги у фото: " + tagN]);
    if (!same(G.tags, GO.tags)) gl.push(["changed", "Список тегів (кнопки фільтра)"]);
    add("gallery", gl);
    // anything else that changed but is not described above
    const known = new Set(res.map((r) => r.tab));
    changedTabs().forEach((t) => { if (!known.has(t)) res.push({ tab: t, lines: [["changed", "Зміни в розділі"]] }); });
    return res;
  }
  function unsavedCount() {
    const cur = cardSnapshot(state.content), old = cardSnapshot(state.original);
    return (state.draftKeys || []).filter((k) => cur.has(k) && cur.get(k) !== old.get(k)).length;
  }
  function openPublishReview() {
    if (!isDirty()) { toast("Немає змін для публікації."); return; }
    const sum = changeSummary();
    const KIND = { new: ["Нове", "new"], changed: ["Змінено", "changed"], deleted: ["Видалено", "deleted"] };
    const total = sum.reduce((n, s2) => n + s2.lines.length, 0);
    const node = h("div", { class: "pub-review" },
      h("h3", null, "Перевірте перед публікацією"),
      h("p", { class: "muted" }, "Ось що зміниться на сайті (" + total + "). Натисніть на назву розділу, щоб повернутися до нього."),
      state.restoredFrom ? h("div", { class: "hist-restored" }, "Ви повертаєте версію сайту від " + fmtWhen(state.restoredFrom.date) + ".") : null,
      unsavedCount() ? h("div", { class: "hist-restored" }, "Увага: " + unsavedCount() + " карт. ще чернетки (ви вийшли з них без збереження). Якщо опублікувати зараз, вони теж з'являться на сайті.") : null,
      h("div", { class: "pub-list" },
        sum.map((sec) => h("div", { class: "pub-sec" },
          h("button", { class: "pub-sec-name", type: "button", onclick: () => { closeModal(); goTab(sec.tab); } }, TAB_NAMES[sec.tab], h("span", { class: "count-pill" }, String(sec.lines.length))),
          h("ul", null, sec.lines.map(([k, text]) => h("li", null, h("span", { class: "pub-kind " + KIND[k][1] }, KIND[k][0]), h("span", null, text))))))),
      h("div", { class: "modal-actions" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: closeModal }, "Повернутися до редагування"),
        h("span", { class: "pe-spacer" }),
        h("button", { class: "btn btn-ghost", type: "button", onclick: () => { closeModal(); preview(); } }, "👁 Переглянути сайт"),
        h("button", { class: "btn btn-teal", type: "button", onclick: async () => { closeModal(); await publish(); } }, "Опублікувати на сайті")));
    openModal(node);
  }

  // ── history of publications (last 30 days) and rollback ──
  const COMMIT_TAG = "[адмінка]";
  function commitMessage() {
    if (state.restoredFrom) return "Адмінка: повернуто версію від " + fmtWhen(state.restoredFrom.date) + " " + COMMIT_TAG;
    const names = changedTabs().map((t) => TAB_NAMES[t]);
    return "Адмінка: " + (names.length ? names.join(", ") : "оновлення контенту") + " " + COMMIT_TAG;
  }
  function fmtWhen(iso, long) {
    const d = new Date(iso);
    if (!isFinite(d)) return "";
    return new Intl.DateTimeFormat("uk-UA", long ? { weekday: "short", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  }
  function ago(iso) {
    const m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 1) return "щойно";
    if (m < 60) return m + " хв тому";
    const hh = Math.round(m / 60);
    if (hh < 24) return hh + " год тому";
    const dd = Math.round(hh / 24);
    return dd === 1 ? "вчора" : dd + " дн. тому";
  }
  function niceMessage(msg) {
    const first = String(msg || "").split("\n")[0].replace(" " + COMMIT_TAG, "").trim();
    if (/^Оновлення контенту через адмінку$/.test(first)) return "Зміни через адмінку";
    return first.replace(/^Адмінка:\s*/, "") || "Зміни";
  }
  async function loadHistory(force) {
    if (state.history && !force) return state.history;
    const since = new Date(Date.now() - HISTORY_DAYS * 86400000).toISOString();
    const list = await gh("/commits?path=" + encodeURIComponent(CONTENT_PATH) + "&sha=" + BRANCH + "&since=" + since + "&per_page=100");
    state.history = (list || []).map((c) => ({
      sha: c.sha,
      date: (c.commit && (c.commit.committer || c.commit.author || {}).date) || "",
      message: (c.commit && c.commit.message) || "",
      byAdmin: /адмінк/i.test((c.commit && c.commit.message) || ""),
    }));
    if (state.history[0]) state.lastPublished = { date: state.history[0].date, sha: state.history[0].sha };
    return state.history;
  }
  async function loadLastPublished() {
    try {
      const list = await gh("/commits?path=" + encodeURIComponent(CONTENT_PATH) + "&sha=" + BRANCH + "&per_page=1");
      if (list && list[0]) state.lastPublished = { date: list[0].commit.committer.date, sha: list[0].sha };
      renderSide();
    } catch (e) {}
  }
  async function fetchVersion(sha) {
    const f = await gh("/contents/" + CONTENT_PATH + "?ref=" + sha);
    return parseContent(b64ToUtf8(f.content));
  }
  // photos that the old version uses but that were deleted later: take them back from that version
  async function findRestoreBlobs(sha, content) {
    const out = {};
    try {
      const [oldTree, headTree] = await Promise.all([gh("/git/trees/" + sha + "?recursive=1"), gh("/git/trees/" + BRANCH + "?recursive=1")]);
      if (!oldTree || !oldTree.tree || !headTree || !headTree.tree) return out;
      const head = new Set(headTree.tree.map((x) => x.path));
      const old = {};
      oldTree.tree.forEach((x) => (old[x.path] = x.sha));
      referencedPaths(content).forEach((p) => {
        if (!head.has(p) && old[p]) out[p] = { sha: old[p], url: `https://raw.githubusercontent.com/${OWNER}/${REPO}/${sha}/${p}` };
      });
    } catch (e) {}
    return out;
  }
  function diffSections(a, b) {
    return ALL_TABS.filter((t) => SECTION_KEYS[t].some((k) => JSON.stringify(a[k]) !== JSON.stringify(b[k]))).map((t) => TAB_NAMES[t]);
  }
  async function previewVersion(item) {
    progress.show("Завантажую версію…", 0.5);
    try {
      const c = await fetchVersion(item.sha);
      const blobs = await findRestoreBlobs(item.sha, c);
      const keep = { content: state.content, pending: state.pending, restoreBlobs: state.restoreBlobs };
      state.content = c; state.pending = {}; state.restoreBlobs = blobs;
      const draft = previewDraft();
      Object.assign(state, keep);
      window.__linaPreviewDraft = draft;
      progress.hide();
      preview("", { draft, title: "Версія від " + fmtWhen(item.date) });
    } catch (e) {
      progress.hide();
      toast("Не вдалося завантажити версію: " + e.message, true);
    }
  }
  async function restoreVersion(item) {
    if (isDirty() && !confirm("Зараз є неопубліковані зміни. Замінити їх цією старою версією?")) return;
    progress.show("Завантажую версію від " + fmtWhen(item.date) + "…", 0.4);
    try {
      const c = await fetchVersion(item.sha);
      const blobs = await findRestoreBlobs(item.sha, c);
      state.content = c;
      state.pending = {};
      state.restoreBlobs = blobs;
      state.restoredFrom = { sha: item.sha, date: item.date };
      progress.hide();
      changed();
      const diff = diffSections(c, state.original);
      toast(diff.length ? "Версію завантажено. Зміниться: " + diff.join(", ") + ". Перегляньте й натисніть «Опублікувати»." : "Ця версія така сама, як зараз на сайті.");
    } catch (e) {
      progress.hide();
      toast("Не вдалося завантажити версію: " + e.message, true);
    }
  }
  function renderHistory() {
    const view = $("historyView");
    const head = h("div", { class: "view-head" },
      h("div", null, h("div", { class: "chip" }, "Публікації"), h("h2", null, "Історія змін")),
      h("p", { class: "muted" }, "Видно публікації за останні " + HISTORY_DAYS + " днів."));
    const last = state.lastPublished
      ? h("div", { class: "hist-last" },
          h("span", { class: "hist-last-ico" }, icon("clock")),
          h("div", null, h("div", { class: "sp-label" }, "Остання публікація сайту"),
            h("div", { class: "hist-last-when" }, fmtWhen(state.lastPublished.date, true), h("span", { class: "muted" }, " · " + ago(state.lastPublished.date)))))
      : null;
    const body = h("div", { class: "group" });
    view.replaceChildren(head, last, body);
    if (state.restoredFrom) {
      view.insertBefore(h("div", { class: "hist-restored" },
        "Завантажено версію від " + fmtWhen(state.restoredFrom.date) + ". Вона ще не на сайті: натисніть «Опублікувати» внизу або «Скасувати», щоб повернутися."), body);
    }
    if (!state.history) {
      body.append(h("p", { class: "muted" }, "Завантажую історію…"));
      loadHistory().then(() => state.tab === "history" && renderHistory(), (e) => {
        body.replaceChildren(h("p", { class: "error" }, "Не вдалося завантажити історію: " + e.message));
      });
      return;
    }
    if (!state.history.length) {
      body.append(h("p", { class: "muted" }, "За останні " + HISTORY_DAYS + " днів публікацій не було."));
      return;
    }
    body.append(h("div", { class: "group-head" }, h("h3", null, "Публікації", h("span", { class: "count-pill" }, String(state.history.length)))));
    const list = h("div", { class: "hist-list" });
    state.history.forEach((item, i) => {
      const current = i === 0;
      list.append(h("div", { class: "hist-item" + (current ? " current" : "") + (state.restoredFrom && state.restoredFrom.sha === item.sha ? " picked" : "") },
        h("span", { class: "hist-dot" }),
        h("div", { class: "hist-main" },
          h("div", { class: "hist-when" }, fmtWhen(item.date, true), h("span", { class: "muted" }, " · " + ago(item.date))),
          h("div", { class: "hist-msg" }, niceMessage(item.message)),
          current ? h("div", { class: "trow-badges" }, h("span", { class: "badge st live" }, "Зараз на сайті")) : null),
        h("div", { class: "trow-actions" },
          h("button", { class: "icon-btn act", title: "Переглянути, як сайт виглядав у цій версії", "aria-label": "Переглянути", onclick: () => previewVersion(item) }, icon("eye")),
          current ? null : h("button", { class: "btn btn-ghost btn-small hist-restore", title: "Завантажити цю версію в адмінку, щоб опублікувати її знову", onclick: () => restoreVersion(item) }, icon("undo"), "Повернути"))));
    });
    body.append(list);
  }

  // ── right info panel (desktop) ──
  const SECTION_KEYS = { events: ["events"], teachers: ["teachers"], prices: ["prices"], halls: ["halls"], about: ["founder"], cert: ["cert"], gallery: ["gallery"], history: [] };
  const TAB_NAMES = { events: "Події", teachers: "Викладачі", prices: "Ціни", halls: "Зали", about: "Про студію", cert: "Сертифікат", gallery: "Галерея", history: "Історія змін" };
  const TAB_TIPS = {
    events: "Подія з'являється на сайті сама в день початку і зникає після завершення. Публікувати вдруге не треба.",
    teachers: "Порядок карток тут такий самий, як на сайті. Щоб поміняти місцями, перетягніть картку за ⠿ зліва.",
    prices: "Позначте тариф як «Популярний», і він буде виділений на сайті.",
    halls: "Приховані зали лишаються тут, але на сайті їх не видно.",
    about: "Тексти можна заповнити лише російською. Інші мови візьмуть переклад або російський текст.",
    cert: "Фото сертифіката найкраще виглядає горизонтальним.",
    gallery: "Теги допомагають відвідувачам фільтрувати фото. Одне фото може мати кілька тегів.",
    history: "Повернення версії спершу завантажує її сюди. На сайті вона з'явиться лише після «Опублікувати».",
  };
  function changedTabs() {
    if (!state.content || !state.original) return [];
    return ALL_TABS.filter((t) => SECTION_KEYS[t].some((k) => JSON.stringify(state.content[k]) !== JSON.stringify(state.original[k])));
  }
  function goTab(t) {
    if (state.tab === t) return;
    state.tab = t;
    render();
    $("app").scrollTop = 0;
    window.scrollTo(0, 0);
  }
  function countPrices(p) {
    let n = 0;
    Object.values(p || {}).forEach((arr) => (arr || []).forEach((x) => { if (!x.hidden) n++; }));
    return n;
  }
  function renderSide() {
    const el = $("sidePanel");
    if (!el || !state.content) return;
    const c = state.original || state.content;
    const now = Date.now();
    const evs = c.events || [];
    const draftEvs = state.content.events || [];
    const live = evs.filter((e) => eventStatus(e, now) === "live").length;
    const sched = evs.filter((e) => eventStatus(e, now) === "scheduled");
    const upcoming = draftEvs.filter((e) => ["live", "scheduled"].includes(eventStatus(e, now)) && e.date)
      .sort((a, b) => warsawTime(a.date) - warsawTime(b.date))[0];
    const changed = changedTabs();
    const today = new Intl.DateTimeFormat("uk-UA", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    const stat = (tab, num, label) => h("button", { class: "sp-stat" + (state.tab === tab ? " on" : ""), type: "button", title: "Відкрити розділ «" + TAB_NAMES[tab] + "»", onclick: () => goTab(tab) },
      h("b", {}, String(num)), h("span", {}, label));
    el.replaceChildren(...[
      h("div", { class: "sp-hello" },
        h("span", { class: "sp-avatar" }, "Л"),
        h("div", {}, h("div", { class: "sp-hi" }, "Вітаю, Лано!"), h("div", { class: "sp-date" }, today))),
      h("div", { class: "sp-card sp-status" + (changed.length ? " dirty" : "") },
        h("div", { class: "sp-label" }, "Стан сайту"),
        h("div", { class: "sp-state" }, h("i", { class: "sp-dot" }), changed.length ? "Є неопубліковані зміни" : "Усе опубліковано"),
        state.lastPublished
          ? h("button", { class: "sp-last", type: "button", title: "Відкрити історію змін", onclick: () => goTab("history") },
              icon("clock"), h("span", null, "Остання публікація: ", h("b", null, fmtWhen(state.lastPublished.date)), h("br"), h("small", null, ago(state.lastPublished.date))))
          : null,
        changed.length
          ? h("div", { class: "sp-chips" }, ...changed.map((t) => h("button", { class: "sp-chip", type: "button", onclick: () => goTab(t) }, TAB_NAMES[t])))
          : h("p", { class: "sp-note" }, "Сайт показує те саме, що й тут."),
        changed.length
          ? h("div", { class: "sp-btns" },
              h("button", { class: "btn btn-ghost btn-small", type: "button", onclick: () => $("previewBtn").click() }, "👁 Перегляд сайту"))
          : null),
      h("div", { class: "sp-card" },
        h("div", { class: "sp-label" }, "На сайті зараз"),
        h("div", { class: "sp-stats" },
          stat("events", live, live === 1 ? "подія" : "подій"),
          stat("teachers", (c.teachers || []).filter((t) => !t.hidden).length, "викладачів"),
          stat("prices", countPrices(c.prices), "тарифів"),
          stat("halls", ((c.halls && c.halls.rooms) || []).filter((r) => !r.hidden).length, "залів"),
          stat("gallery", ((c.gallery && c.gallery.photos) || []).length, "фото"),
          stat("events", sched.length, "заплановано"))),
      upcoming
        ? h("button", { class: "sp-card sp-event", type: "button", title: "Відкрити розділ «Події»", onclick: () => goTab("events") },
            upcoming.image ? h("img", { src: imgUrl(upcoming.image), alt: "" }) : h("span", { class: "sp-event-ph" }, "🎵"),
            h("div", { class: "sp-event-body" },
              h("div", { class: "sp-label" }, "Найближча подія"),
              h("div", { class: "sp-event-title" }, ((upcoming.text && upcoming.text.ru) || {}).title || "Без назви"),
              h("div", { class: "sp-event-date" }, niceDate(upcoming.date))))
        : null,
      h("div", { class: "sp-card sp-tip" },
        h("div", { class: "sp-label" }, "Підказка · " + TAB_NAMES[state.tab]),
        h("p", {}, TAB_TIPS[state.tab] || "")),
    ].filter(Boolean));
  }

  // ── render ──
  function render() {
    const switched = render._tab !== state.tab;
    render._tab = state.tab;
    ALL_TABS.forEach((t) => ($(t + "View").hidden = state.tab !== t));
    if (switched) {
      const v = $(state.tab + "View");
      v.classList.remove("view-enter");
      void v.offsetWidth;
      v.classList.add("view-enter");
    }
    document.querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === state.tab);
      b.classList.remove("tab-slide");
      // slide-in only when the person switches tabs, not when the page opens
      if (switched && render._booted && b.dataset.tab === state.tab) { void b.offsetWidth; b.classList.add("tab-slide"); }
    });
    render._booted = true;
    const y = window.scrollY;
    if (state.tab === "events") renderEvents();
    if (state.tab === "teachers") renderTeachers();
    if (state.tab === "prices") renderPrices();
    if (state.tab === "gallery") renderGallery();
    if (state.tab === "halls") renderHalls();
    if (state.tab === "about") renderAbout();
    if (state.tab === "cert") renderCert();
    if (state.tab === "history") renderHistory();
    renderSide();
    markDrafts();
    window.scrollTo(0, y);
  }

  // ── publish ──
  async function publish() {
    if (!isDirty()) { toast("Немає змін для публікації."); return false; }
    const btn = $("publishBtn");
    btn.disabled = true;
    btn.textContent = "Публікую…";
    progress.show("Готую публікацію…", 0);
    try {
      const latest = await fetchContentFile();
      if (latest.sha !== state.contentSha) {
        if (!confirm("Контент на сайті змінився після того, як ви відкрили адмінку (можливо, з іншого пристрою). Опублікувати ваші зміни поверх нього?")) {
          throw new Error("Публікацію скасовано. Оновіть сторінку, щоб побачити свіжу версію.");
        }
      }
      const ref = await gh("/git/ref/heads/" + BRANCH);
      const headSha = ref.object.sha;
      const headCommit = await gh("/git/commits/" + headSha);

      const now = referencedPaths(state.content);
      const before = referencedPaths(state.original);
      const tree = [];
      const toUpload = Object.keys(state.pending).filter((path) => now.has(path));
      const steps = toUpload.length + 2;
      for (let i = 0; i < toUpload.length; i++) {
        const path = toUpload[i];
        progress.show(`Завантажую фото ${i + 1} з ${toUpload.length}…`, i / steps);
        const blob = await gh("/git/blobs", { method: "POST", body: { content: state.pending[path].base64, encoding: "base64" } });
        tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      Object.keys(state.restoreBlobs || {}).forEach((path) => {
        if (now.has(path) && !state.pending[path]) tree.push({ path, mode: "100644", type: "blob", sha: state.restoreBlobs[path].sha });
      });
      progress.show("Зберігаю тексти та порядок карток…", toUpload.length / steps);
      const contentBlob = await gh("/git/blobs", { method: "POST", body: { content: utf8ToB64(serializeContent(state.content)), encoding: "base64" } });
      tree.push({ path: CONTENT_PATH, mode: "100644", type: "blob", sha: contentBlob.sha });
      before.forEach((path) => {
        if (!now.has(path) && DELETABLE.test(path) && !state.pending[path] && !(state.restoreBlobs || {})[path]) tree.push({ path, mode: "100644", type: "blob", sha: null });
      });

      const newTree = await gh("/git/trees", { method: "POST", body: { base_tree: headCommit.tree.sha, tree } });
      const commit = await gh("/git/commits", { method: "POST", body: { message: commitMessage(), tree: newTree.sha, parents: [headSha] } });
      progress.show("Публікую на сайті…", (toUpload.length + 1) / steps);
      await gh("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: commit.sha } });
      progress.show("Готово! Сайт оновиться за 1–2 хвилини.", 1);

      const fresh = await fetchContentFile();
      state.contentSha = fresh.sha;
      state.original = clone(state.content);
      state.pending = {};
      state.restoreBlobs = {};
      state.restoredFrom = null;
      state.draftKeys = [];
      state.lastPublished = { date: new Date().toISOString(), sha: commit.sha };
      state.history = null;
      try { localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
      toast("Опубліковано! Сайт оновиться приблизно за 1–2 хвилини.");
      render();
      return true;
    } catch (e) {
      console.error(e);
      progress.hide();
      toast(e.status === 401 || e.status === 403 ? "GitHub не дозволив запис. Перевірте, що ключ має доступ Contents: Read and write." : "Не вдалося опублікувати: " + e.message, true);
    } finally {
      btn.innerHTML = '<span class="lg">Опублікувати на сайті</span><span class="sm">Опублікувати</span>';
      setTimeout(() => progress.hide(), 1500);
      updateSavebar();
    }
  }

  // ── preview: the real site in a frame, with the unsaved changes ──
  const PREVIEW_PAGE = window.__LINA_PREVIEW_PAGE || "../index.html";
  function previewDraft() {
    const c = clone(state.content);
    const swap = (p) => (state.pending[p] ? state.pending[p].dataUrl : p);
    const sw = (p) => (state.restoreBlobs && state.restoreBlobs[p] ? state.restoreBlobs[p].url : swap(p));
    (c.teachers || []).forEach((t) => (t.photo = sw(t.photo)));
    ((c.gallery && c.gallery.photos) || []).forEach((p) => (p.src = sw(p.src)));
    (c.events || []).forEach((e) => (e.image = sw(e.image)));
    ((c.halls && c.halls.rooms) || []).forEach((r) => (r.photo = sw(r.photo)));
    if (c.founder) c.founder.photo = sw(c.founder.photo);
    if (c.cert) c.cert.image = sw(c.cert.image);
    return c;
  }
  const SECTION_FOR_TAB = { events: "afisha", teachers: "vocal", prices: "pricing", gallery: "gallery", halls: "halls", about: "founder", cert: "cert" };
  function preview(section, opts) {
    opts = opts || {};
    if (typeof section !== "string") section = SECTION_FOR_TAB[state.tab] || "";
    window.__linaPreviewDraft = opts.draft || previewDraft();
    window.__linaPreviewBanner = section === "afisha";
    let ov = $("previewOverlay");
    if (ov) ov.remove();
    const frame = h("iframe", { name: "linaPreview", class: "pv-frame", title: "Перегляд сайту" });
    const wrap = h("div", { class: "pv-wrap" }, frame);
    const setDevice = (mode) => {
      wrap.classList.toggle("phone", mode === "phone");
      ov.querySelectorAll(".pv-dev").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
      // keep the same part of the page in view after the width changes
      setTimeout(() => {
        try {
          const target = section && frame.contentDocument.getElementById(section);
          if (target) target.scrollIntoView();
        } catch (e) {}
      }, 350);
    };
    const close = () => { ov.remove(); document.body.style.overflow = $("modal").hidden ? "" : "hidden"; };
    ov = h(
      "div",
      { class: "pv-overlay", id: "previewOverlay" },
      h(
        "div",
        { class: "pv-bar" },
        opts.title
          ? h("div", { class: "pv-title" }, h("b", null, opts.title), h("span", { class: "muted" }, "Так сайт виглядав після цієї публікації."))
          : h("div", { class: "pv-title" }, h("b", null, "Попередній перегляд"), h("span", { class: "muted" }, isDirty() ? "Так сайт виглядатиме після публікації. Відвідувачі цього ще не бачать." : "Змін немає: так сайт виглядає зараз.")),
        h(
          "div",
          { class: "pv-actions" },
          h("button", { class: "pv-dev on", "data-mode": "desktop", onclick: () => setDevice("desktop") }, "Комп'ютер"),
          h("button", { class: "pv-dev", "data-mode": "phone", onclick: () => setDevice("phone") }, "Телефон"),
          null,
          h("button", { class: "btn btn-ghost btn-small", onclick: close }, "Закрити")
        )
      ),
      wrap
    );
    document.body.appendChild(ov);
    document.body.style.overflow = "hidden";
    frame.src = PREVIEW_PAGE + (section ? "#" + section : "");
  }

  // ── boot ──
  async function start() {
    $("loginView").hidden = true;
    $("loadingView").hidden = false;
    try {
      const f = await fetchContentFile();
      state.contentSha = f.sha;
      state.content = f.content;
      state.original = clone(f.content);
      state.content.teachers = state.content.teachers || [];
      state.content.events = state.content.events || [];
      loadDraft();
      $("loadingView").hidden = true;
      $("tabs").hidden = false;
      $("topbarRight").hidden = false;
      $("savebar").hidden = false;
      $("sidePanel").hidden = false;
      document.body.classList.add("has-side");
      render();
      loadLastPublished();
      updateSavebar();
    } catch (e) {
      $("loadingView").hidden = true;
      showLogin(e.status === 401 ? "Ключ доступу прострочений. Відкрийте «Перший вхід або новий користувач» і збережіть новий ключ з тією ж поштою та паролем." : e.status === 404 ? "Немає доступу до репозиторію linas-studio. Перевірте налаштування ключа." : "Помилка: " + e.message);
    }
  }
  function showLogin(err) {
    $("loginView").hidden = false;
    $("tabs").hidden = true;
    $("topbarRight").hidden = true;
    $("savebar").hidden = true;
    $("sidePanel").hidden = true;
    document.body.classList.remove("has-side");
    ALL_TABS.forEach((t) => ($(t + "View").hidden = true));
    $("loginError").hidden = !err;
    $("loginError").textContent = err || "";
  }

  // ── Email + password login ──
  // The GitHub key is stored in admin/users.json encrypted (AES-GCM) with a key derived from
  // email + password (PBKDF2-SHA256), so the site needs no server and the key never sits in the repo in plain text.
  const USERS_PATH = "admin/users.json";
  const KDF_ITER = 310000;
  const enc = new TextEncoder();
  const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const normEmail = (e) => String(e || "").trim().toLowerCase();
  async function deriveKey(email, pass, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(normEmail(email) + "\n" + pass), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: KDF_ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  }
  async function emailId(email) {
    return b64(await crypto.subtle.digest("SHA-256", enc.encode("lina-admin:" + normEmail(email))));
  }
  async function fetchUsers(withToken) {
    if (window.__DEMO_USERS) return { sha: null, users: window.__DEMO_USERS };
    const headers = { Accept: "application/vnd.github+json" };
    if (withToken) headers.Authorization = "Bearer " + withToken;
    const res = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + USERS_PATH + "?ref=" + BRANCH, { headers, cache: "no-store" });
    if (res.status === 404) return { sha: null, users: [] };
    if (!res.ok) {
      // public API limit reached: fall back to the published copy of the file
      const r2 = await fetch("users.json?" + Date.now(), { cache: "no-store" });
      if (!r2.ok) throw new Error("users " + res.status);
      return { sha: null, users: (await r2.json()).users || [] };
    }
    const j = await res.json();
    const text = new TextDecoder().decode(unb64(j.content.replace(/\s/g, "")));
    return { sha: j.sha, users: JSON.parse(text).users || [] };
  }
  async function unlock(email, pass) {
    const { users } = await fetchUsers();
    const id = await emailId(email);
    const u = users.find((x) => x.id === id);
    if (!u) return null;
    try {
      const key = await deriveKey(email, pass, unb64(u.salt));
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(u.iv) }, key, unb64(u.data));
      return new TextDecoder().decode(plain);
    } catch (e) {
      return null;
    }
  }
  async function saveUser(token, email, pass) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(email, pass, salt);
    const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(token));
    const entry = { id: await emailId(email), salt: b64(salt), iv: b64(iv), data: b64(data), added: new Date().toISOString() };
    if (window.__DEMO_USERS) { window.__DEMO_USERS = window.__DEMO_USERS.filter((x) => x.id !== entry.id).concat(entry); return; }
    const cur = await fetchUsers(token);
    const users = cur.users.filter((x) => x.id !== entry.id).concat(entry);
    const body = JSON.stringify({ note: "Encrypted admin logins. Each entry opens only with its own email and password.", users }, null, 2) + "\n";
    const bytes = enc.encode(body);
    let bin = ""; bytes.forEach((c) => (bin += String.fromCharCode(c)));
    const res = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO + "/contents/" + USERS_PATH, {
      method: "PUT",
      headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ message: "Адмінка: вхід за поштою [адмінка]", content: btoa(bin), branch: BRANCH }, cur.sha ? { sha: cur.sha } : {})),
    });
    if (!res.ok) { const e = new Error("save " + res.status); e.status = res.status; throw e; }
  }
  function busy(btn, on, text) {
    if (on) { btn.dataset.t = btn.textContent; btn.textContent = text; btn.disabled = true; }
    else { btn.textContent = btn.dataset.t || btn.textContent; btn.disabled = false; }
  }
  $("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("emailInput").value, pass = $("passInput").value;
    if (!email || !pass) return;
    $("loginError").hidden = true;
    busy($("loginBtn"), true, "Перевіряю…");
    let tok = null;
    try { tok = await unlock(email, pass); } catch (err) { showLogin("Не вдалося перевірити вхід. Перевірте інтернет і спробуйте ще раз."); busy($("loginBtn"), false); return; }
    busy($("loginBtn"), false);
    if (!tok) { showLogin("Невірна пошта або пароль."); return; }
    state.token = tok;
    try { localStorage.setItem(TOKEN_KEY, tok); } catch (err) {}
    $("passInput").value = "";
    start();
  });
  $("setupForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const tok = $("tokenInput").value.trim(), email = $("setupEmail").value, p1 = $("setupPass").value, p2 = $("setupPass2").value;
    const err = (m) => { $("setupError").textContent = m; $("setupError").hidden = !m; };
    err("");
    if (p1.length < 8) return err("Пароль має бути не коротший за 8 символів.");
    if (p1 !== p2) return err("Паролі не збігаються.");
    busy($("setupBtn"), true, "Зберігаю…");
    try {
      if (!window.__DEMO_USERS) {
        const r = await fetch("https://api.github.com/repos/" + OWNER + "/" + REPO, { headers: { Authorization: "Bearer " + tok, Accept: "application/vnd.github+json" } });
        if (!r.ok) throw Object.assign(new Error("repo"), { status: r.status });
      }
      await saveUser(tok, email, p1);
    } catch (ex) {
      busy($("setupBtn"), false);
      return err(ex.status === 401 ? "Ключ GitHub недійсний або прострочений." : ex.status === 404 || ex.status === 403 ? "Ключ не має доступу на запис до репозиторію linas-studio." : "Не вдалося зберегти: " + ex.message);
    }
    busy($("setupBtn"), false);
    $("setupForm").reset();
    $("setupBox").open = false;
    state.token = tok;
    try { localStorage.setItem(TOKEN_KEY, tok); } catch (ex) {}
    toast("Готово! Далі входьте з поштою " + normEmail(email) + " і паролем.");
    start();
  });
  $("logoutBtn").addEventListener("click", () => {
    if (isDirty() && !confirm("Є неопубліковані зміни. Вони залишаться чернеткою в цьому браузері й відновляться, коли ви знову увійдете. Вийти?")) return;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    state.token = null;
    state.original = state.content;
    showLogin();
  });
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => goTab(b.dataset.tab)));
  $("publishBtn").addEventListener("click", openPublishReview);
  $("previewBtn").addEventListener("click", preview);
  $("discardBtn").addEventListener("click", () => {
    if (!confirm("Скасувати всі неопубліковані зміни?")) return;
    state.content = clone(state.original);
    state.pending = {};
    state.restoreBlobs = {};
    state.restoredFrom = null;
    state.draftKeys = [];
    changed();
  });
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) softCloseModal(); });
  ["input", "change"].forEach((ev) => $("modalBody").addEventListener(ev, () => (modalEdited = true)));
  $("modalBody").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b && !b.closest(".modal-actions") && !b.classList.contains("lang-tab")) modalEdited = true;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const da = document.getElementById("delAsk");
    if (da) { da.remove(); return; }
    const pv = $("previewOverlay");
    if (pv) { pv.querySelector(".pv-actions .btn-ghost").click(); return; }
    if (!$("modal").hidden) softCloseModal();
  });
  window.addEventListener("beforeunload", (e) => {
    if (state.content && isDirty()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  try { state.token = localStorage.getItem(TOKEN_KEY); } catch (e) {}
  if (state.token) start();
  else showLogin();
})();
