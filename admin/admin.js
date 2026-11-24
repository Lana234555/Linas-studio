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
  const LANGS = [
    ["ru", "RU"],
    ["en", "EN"],
    ["pl", "PL"],
  ];
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
  // Only files inside these folders are ever deleted by the admin
  const DELETABLE = /^photo\/(gallery|koncert|kvartirnyky|kemp|teachers|events)\//;

  const state = {
    token: null,
    original: null, // content as last loaded/published
    content: null, // working copy
    contentSha: null, // blob sha of content.js at load time
    pending: {}, // path -> { dataUrl, base64 } for newly added photos
    tab: "events",
    galleryFilter: "all",
    uploadTags: [],
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
  function imgUrl(path) {
    if (!path) return "";
    if (state.pending[path]) return state.pending[path].dataUrl;
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
    return set;
  }

  // ── dirty tracking ──
  function isDirty() {
    return JSON.stringify(state.content) !== JSON.stringify(state.original);
  }
  function updateSavebar() {
    const dirty = isDirty();
    $("savebar").classList.toggle("dirty", dirty);
    $("saveStatus").textContent = dirty ? "Є неопубліковані зміни" : "Усі зміни опубліковані";
    $("publishBtn").disabled = !dirty;
    $("discardBtn").disabled = !dirty;
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
  async function resizeToJpeg(file, maxSide) {
    const img = await loadImage(await readFile(file));
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

  // ── modal ──
  function openModal(node) {
    const body = $("modalBody");
    body.innerHTML = "";
    body.appendChild(node);
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
  }
  // Buttons at the bottom of every editor window.
  // apply() validates and saves the draft into the content; returns true on success.
  function editorActions(apply, section) {
    const done = (then) => () => {
      if (!apply()) return;
      closeModal();
      changed();
      if (then) then();
    };
    return h(
      "div",
      { class: "modal-actions" },
      h("button", { class: "btn btn-ghost", type: "button", onclick: closeModal }, "Скасувати"),
      h("span", { class: "pe-spacer" }),
      h("button", { class: "btn btn-ghost", type: "button", title: "Подивитися, як це виглядатиме на сайті", onclick: done(() => preview(section ? section() : "")) }, "👁 Переглянути на сайті"),
      h("button", { class: "btn btn-ghost", type: "button", onclick: done(null) }, "Готово"),
      h("button", { class: "btn btn-teal", type: "button", onclick: done(() => publish()) }, "Опублікувати на сайті")
    );
  }
  function closeModal() {
    $("modal").hidden = true;
    document.body.style.overflow = "";
  }

  // small reusable widgets
  function langTabs(onSwitch, initial) {
    const wrap = h("div", { class: "lang-tabs" });
    LANGS.forEach(([code, label]) => {
      const b = h("button", { class: "lang-tab" + (code === initial ? " active" : ""), type: "button" }, label);
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
            { class: "trow" + (t.hidden ? " is-hidden" : "") },
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
              h("button", { class: "icon-btn", title: "Вище", disabled: pos === 0, onclick: () => moveTeacher(i, list, pos, -1) }, "↑"),
              h("button", { class: "icon-btn", title: "Нижче", disabled: pos === list.length - 1, onclick: () => moveTeacher(i, list, pos, 1) }, "↓"),
              h("button", { class: "btn btn-ghost btn-small", onclick: () => editTeacher(i) }, "Редагувати"),
              h("button", { class: "btn btn-ghost btn-small", onclick: () => { t.hidden = !t.hidden; changed(); } }, t.hidden ? "Показати" : "Сховати"),
              h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => deleteTeacher(i) }, "✕")
            )
          )
        );
      });
      if (!list.length) rows.appendChild(h("p", { class: "muted" }, "Поки немає карток."));
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
  function moveTeacher(index, list, pos, dir) {
    const other = list[pos + dir];
    if (!other) return;
    const arr = state.content.teachers;
    [arr[index], arr[other.i]] = [arr[other.i], arr[index]];
    changed();
  }
  function deleteTeacher(i) {
    const name = (state.content.teachers[i].text.ru || {}).name || "цю картку";
    if (!confirm(`Видалити «${name}»? Після публікації картка зникне з сайту.`)) return;
    state.content.teachers.splice(i, 1);
    changed();
  }

  function editTeacher(index, section) {
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
      const input = h("input", { type: "file", accept: "image/*" });
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
      { class: "plan" + (p.hidden ? " is-hidden" : "") },
      h(
        "div",
        { class: "plan-head" },
        h("div", null, h("span", { class: "plan-title" }, (p.title && p.title.ru) || "Нова картка"), h("span", { class: "badge " + p.style }, p.badge || p.style), p.hidden ? h("span", { class: "badge off" }, "приховано") : null),
        h(
          "div",
          { class: "trow-actions" },
          h("button", { class: "icon-btn", title: "Лівіше", disabled: i === 0, onclick: () => { [plans[i - 1], plans[i]] = [plans[i], plans[i - 1]]; changed(); } }, "←"),
          h("button", { class: "icon-btn", title: "Правіше", disabled: i === plans.length - 1, onclick: () => { [plans[i + 1], plans[i]] = [plans[i], plans[i + 1]]; changed(); } }, "→"),
          h("button", { class: "icon-btn", title: p.hidden ? "Показати" : "Сховати", onclick: () => { p.hidden = !p.hidden; changed(); } }, p.hidden ? "◌" : "◉"),
          h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => { if (confirm("Видалити цю картку цін?")) { plans.splice(i, 1); changed(); } } }, "✕")
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
      tagList.appendChild(
        h(
          "span",
          { class: "tag-chip" },
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
                state.uploadTags = state.uploadTags.filter((x) => x !== tag.id);
                changed();
              },
            },
            "✕"
          )
        )
      );
    });
    view.appendChild(
      h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, "Теги"), h("button", { class: "btn btn-teal btn-small", onclick: () => editTag(null) }, "+ Новий тег")), tagList)
    );

    // upload
    const fileInput = h("input", { type: "file", accept: "image/*", multiple: true });
    fileInput.addEventListener("change", async () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) return;
      fileInput.value = "";
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const title = files.length > 1 ? `Фото ${i + 1} з ${files.length}` : "Нове фото";
        try {
          const path = await addPendingImage(f, "gallery", "", 1600, title);
          if (!path) continue;
          g.photos.unshift({ src: path, tags: state.uploadTags.slice() });
          added++;
          changed();
        } catch (e) {
          toast(f.name + ": " + e.message, true);
        }
      }
      if (added) toast(`Додано ${added} фото. Їх видно лише тут, поки ви не натиснете «Опублікувати на сайті».`);
      changed();
    });
    view.appendChild(
      h(
        "div",
        { class: "upload-box" },
        h("span", { class: "btn btn-teal file-btn" }, "+ Додати фото", fileInput),
        h("span", { class: "muted" }, "Нові фото отримають теги:"),
        h(
          "div",
          { class: "check-list" },
          g.tags.map((tag) =>
            h(
              "label",
              { class: "check" },
              h("input", {
                type: "checkbox",
                checked: state.uploadTags.includes(tag.id),
                onchange: (e) => {
                  if (e.target.checked) state.uploadTags.push(tag.id);
                  else state.uploadTags = state.uploadTags.filter((x) => x !== tag.id);
                },
              }),
              (tag.label && tag.label.ru) || tag.id
            )
          )
        )
      )
    );

    // filter + grid
    const filterOpts = [["all", "Усі фото"], ["__none", "Без тегів"]].concat(g.tags.map((t) => [t.id, (t.label && t.label.ru) || t.id]));
    view.appendChild(h("div", { class: "filter-row" }, h("span", { class: "muted" }, "Показати:"), select(filterOpts, state.galleryFilter, (v) => { state.galleryFilter = v; renderGallery(); })));
    const grid = h("div", { class: "photos" });
    g.photos
      .filter((p) => {
        if (state.galleryFilter === "all") return true;
        if (state.galleryFilter === "__none") return !(p.tags || []).length;
        return (p.tags || []).includes(state.galleryFilter);
      })
      .forEach((p) => {
        p.tags = p.tags || [];
        grid.appendChild(
          h(
            "div",
            { class: "photo" },
            imgWithFallback(p.src),
            h(
              "div",
              { class: "photo-body" },
              h(
                "div",
                { class: "photo-tags" },
                g.tags.map((tag) =>
                  h(
                    "button",
                    {
                      class: "ptag" + (p.tags.includes(tag.id) ? " on" : ""),
                      title: p.tags.includes(tag.id) ? "Зняти тег" : "Додати тег",
                      onclick: () => {
                        p.tags = p.tags.includes(tag.id) ? p.tags.filter((x) => x !== tag.id) : p.tags.concat(tag.id);
                        changed();
                      },
                    },
                    tagLabel(tag.id)
                  )
                )
              ),
              h(
                "div",
                { class: "photo-foot" },
                state.pending[p.src] ? h("span", { class: "new-mark" }, "нове") : h("span"),
                h(
                  "button",
                  {
                    class: "icon-btn",
                    title: "Редагувати фото (обрізати, наблизити, повернути)",
                    onclick: async () => {
                      const np = await reeditImage(p.src, "gallery", "");
                      if (np) { p.src = np; changed(); }
                    },
                  },
                  "✎"
                ),
                h(
                  "button",
                  {
                    class: "icon-btn danger",
                    title: "Видалити фото",
                    onclick: () => {
                      if (!confirm("Видалити це фото з галереї?")) return;
                      g.photos = g.photos.filter((x) => x !== p);
                      changed();
                    },
                  },
                  "✕"
                )
              )
            )
          )
        );
      });
    view.appendChild(grid);
  }

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
    const order = ["live", "scheduled", "draft", "ended"];
    const titles = { live: "Зараз на сайті", scheduled: "Заплановані (з'являться самі)", draft: "Чернетки", ended: "Завершені (вже не показуються)" };
    const items = events.map((e, i) => ({ e, i, s: eventStatus(e, now) }));
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
            { class: "trow evrow st-" + s },
            e.image ? imgWithFallback(e.image) : h("div", { class: "ph" }, "🎤"),
            h(
              "div",
              null,
              h(
                "div",
                { class: "trow-name" },
                ru.title || "(без назви)",
                h("span", { class: "badge st " + STATUS[s][1] }, STATUS[s][0]),
                e.banner ? h("span", { class: "badge star" }, "★ Банер") : null
              ),
              h("div", { class: "trow-role" }, "🗓 " + niceDate(e.date)),
              h("div", { class: "ev-sched" }, scheduleText(e))
            ),
            h(
              "div",
              { class: "trow-actions" },
              h("button", { class: "btn btn-ghost btn-small", onclick: () => editEvent(i) }, "Редагувати"),
              h("button", { class: "btn btn-ghost btn-small", title: "Створити копію (наприклад, для наступного такого ж івенту)", onclick: () => { const c = clone(e); c.id = "e" + Date.now().toString(36); c.hidden = true; events.push(c); changed(); toast("Копію створено як чернетку."); } }, "Копія"),
              h("button", { class: "icon-btn danger", title: "Видалити", onclick: () => { if (confirm(`Видалити подію «${ru.title || "без назви"}»?`)) { events.splice(i, 1); changed(); } } }, "✕")
            )
          )
        );
      });
      view.appendChild(h("div", { class: "group" }, h("div", { class: "group-head" }, h("h3", null, titles[s], h("span", { class: "count-pill" }, String(list.length)))), rows));
    });
  }

  function editEvent(index) {
    const isNew = index < 0;
    const e = isNew ? emptyEvent() : clone(state.content.events[index]);
    e.text = e.text || {};
    LANGS.forEach(([l]) => (e.text[l] = Object.assign({ title: "", place: "", desc: "", button: "" }, e.text[l] || {})));
    let lang = "ru";

    const photoBox = h("div", { class: "photo-pick wide" });
    function drawPhoto() {
      photoBox.innerHTML = "";
      photoBox.appendChild(e.image ? imgWithFallback(e.image) : h("div", { class: "ph" }, "🎤"));
      const input = h("input", { type: "file", accept: "image/*" });
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
        return true;
      }, () => "afisha")
    );
    openModal(node);
  }

  // ── render ──
  function render() {
    ["events", "teachers", "prices", "gallery"].forEach((t) => ($(t + "View").hidden = state.tab !== t));
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
    const y = window.scrollY;
    if (state.tab === "events") renderEvents();
    if (state.tab === "teachers") renderTeachers();
    if (state.tab === "prices") renderPrices();
    if (state.tab === "gallery") renderGallery();
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
      progress.show("Зберігаю тексти та порядок карток…", toUpload.length / steps);
      const contentBlob = await gh("/git/blobs", { method: "POST", body: { content: utf8ToB64(serializeContent(state.content)), encoding: "base64" } });
      tree.push({ path: CONTENT_PATH, mode: "100644", type: "blob", sha: contentBlob.sha });
      before.forEach((path) => {
        if (!now.has(path) && DELETABLE.test(path) && !state.pending[path]) tree.push({ path, mode: "100644", type: "blob", sha: null });
      });

      const newTree = await gh("/git/trees", { method: "POST", body: { base_tree: headCommit.tree.sha, tree } });
      const commit = await gh("/git/commits", { method: "POST", body: { message: "Оновлення контенту через адмінку", tree: newTree.sha, parents: [headSha] } });
      progress.show("Публікую на сайті…", (toUpload.length + 1) / steps);
      await gh("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: commit.sha } });
      progress.show("Готово! Сайт оновиться за 1–2 хвилини.", 1);

      const fresh = await fetchContentFile();
      state.contentSha = fresh.sha;
      state.original = clone(state.content);
      state.pending = {};
      try { localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
      toast("Опубліковано! Сайт оновиться приблизно за 1–2 хвилини.");
      render();
      return true;
    } catch (e) {
      console.error(e);
      progress.hide();
      toast(e.status === 401 || e.status === 403 ? "GitHub не дозволив запис. Перевірте, що ключ має доступ Contents: Read and write." : "Не вдалося опублікувати: " + e.message, true);
    } finally {
      btn.textContent = "Опублікувати на сайті";
      setTimeout(() => progress.hide(), 1500);
      updateSavebar();
    }
  }

  // ── preview: the real site in a frame, with the unsaved changes ──
  const PREVIEW_PAGE = window.__LINA_PREVIEW_PAGE || "../index.html";
  function previewDraft() {
    const c = clone(state.content);
    const swap = (p) => (state.pending[p] ? state.pending[p].dataUrl : p);
    c.teachers.forEach((t) => (t.photo = swap(t.photo)));
    c.gallery.photos.forEach((p) => (p.src = swap(p.src)));
    (c.events || []).forEach((e) => (e.image = swap(e.image)));
    return c;
  }
  const SECTION_FOR_TAB = { events: "afisha", teachers: "vocal", prices: "pricing", gallery: "gallery" };
  function preview(section) {
    if (typeof section !== "string") section = SECTION_FOR_TAB[state.tab] || "";
    window.__linaPreviewDraft = previewDraft();
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
    const pubBtn = h("button", { class: "btn btn-teal btn-small", disabled: !isDirty(), onclick: async () => { const ok = await publish(); if (ok) close(); } }, "Опублікувати на сайті");
    ov = h(
      "div",
      { class: "pv-overlay", id: "previewOverlay" },
      h(
        "div",
        { class: "pv-bar" },
        h("div", { class: "pv-title" }, h("b", null, "Попередній перегляд"), h("span", { class: "muted" }, isDirty() ? "Так сайт виглядатиме після публікації. Відвідувачі цього ще не бачать." : "Змін немає: так сайт виглядає зараз.")),
        h(
          "div",
          { class: "pv-actions" },
          h("button", { class: "pv-dev on", "data-mode": "desktop", onclick: () => setDevice("desktop") }, "Комп'ютер"),
          h("button", { class: "pv-dev", "data-mode": "phone", onclick: () => setDevice("phone") }, "Телефон"),
          pubBtn,
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
      $("loadingView").hidden = true;
      $("tabs").hidden = false;
      $("topbarRight").hidden = false;
      $("savebar").hidden = false;
      render();
      updateSavebar();
    } catch (e) {
      $("loadingView").hidden = true;
      showLogin(e.status === 401 ? "Ключ недійсний або прострочений. Створіть новий." : e.status === 404 ? "Немає доступу до репозиторію linas-studio. Перевірте налаштування ключа." : "Помилка: " + e.message);
    }
  }
  function showLogin(err) {
    $("loginView").hidden = false;
    $("tabs").hidden = true;
    $("topbarRight").hidden = true;
    $("savebar").hidden = true;
    ["events", "teachers", "prices", "gallery"].forEach((t) => ($(t + "View").hidden = true));
    $("loginError").hidden = !err;
    $("loginError").textContent = err || "";
  }

  $("loginBtn").addEventListener("click", () => {
    const tok = $("tokenInput").value.trim();
    if (!tok) return;
    state.token = tok;
    try { localStorage.setItem(TOKEN_KEY, tok); } catch (e) {}
    start();
  });
  $("tokenInput").addEventListener("keydown", (e) => e.key === "Enter" && $("loginBtn").click());
  $("logoutBtn").addEventListener("click", () => {
    if (isDirty() && !confirm("Є неопубліковані зміни. Вийти без збереження?")) return;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    state.token = null;
    state.original = state.content;
    showLogin();
  });
  document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => { state.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }));
  $("publishBtn").addEventListener("click", publish);
  $("previewBtn").addEventListener("click", preview);
  $("discardBtn").addEventListener("click", () => {
    if (!confirm("Скасувати всі неопубліковані зміни?")) return;
    state.content = clone(state.original);
    state.pending = {};
    changed();
  });
  $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const pv = $("previewOverlay");
    if (pv) { pv.querySelector(".pv-actions .btn-ghost").click(); return; }
    if (!$("modal").hidden) closeModal();
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
