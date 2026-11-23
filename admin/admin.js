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
  const ENROLL_DEFAULT = "https://app.band-space.com/user/search/warszawa/linas_music_studio/tutors";
  // Only files inside these folders are ever deleted by the admin
  const DELETABLE = /^photo\/(gallery|koncert|kvartirnyky|kemp|teachers)\//;

  const state = {
    token: null,
    original: null, // content as last loaded/published
    content: null, // working copy
    contentSha: null, // blob sha of content.js at load time
    pending: {}, // path -> { dataUrl, base64 } for newly added photos
    tab: "teachers",
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
  async function addPendingImage(file, folder, baseName, maxSide) {
    const res = await resizeToJpeg(file, maxSide);
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 7);
    const path = `photo/${folder}/${baseName ? baseName + "-" : ""}${stamp}-${rand}.jpg`;
    state.pending[path] = res;
    return path;
  }

  // ── modal ──
  function openModal(node) {
    const body = $("modalBody");
    body.innerHTML = "";
    body.appendChild(node);
    $("modal").hidden = false;
    document.body.style.overflow = "hidden";
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
          t.photo = await addPendingImage(file, "teachers", slugify(t.text.ru.name) || "teacher", 1000);
          drawPhoto();
        } catch (e) {
          toast(e.message, true);
        }
      });
      photoBox.appendChild(
        h(
          "div",
          null,
          h("span", { class: "btn btn-ghost btn-small file-btn" }, t.photo ? "Змінити фото" : "Завантажити фото", input),
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
      field("Посилання кнопки «Записаться»", textInput(t.enrollUrl, (v) => (t.enrollUrl = v.trim()))),
      h(
        "div",
        { class: "modal-actions" },
        h("button", { class: "btn btn-ghost", type: "button", onclick: closeModal }, "Скасувати"),
        h(
          "button",
          {
            class: "btn btn-teal",
            type: "button",
            onclick: () => {
              if (!t.text.ru.name.trim()) return toast("Вкажіть ім'я російською (RU), це основна мова сайту.", true);
              t.tags = t.tags.filter((x) => (x.ru || x.en || x.pl || "").trim());
              t.videos = t.videos.filter((x) => (x.url || "").trim());
              if (isNew) state.content.teachers.push(t);
              else state.content.teachers[index] = t;
              closeModal();
              changed();
            },
          },
          "Готово"
        )
      )
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
      toast(`Обробляю ${files.length} фото…`);
      let added = 0;
      for (const f of files) {
        try {
          const path = await addPendingImage(f, "gallery", "", 1600);
          g.photos.unshift({ src: path, tags: state.uploadTags.slice() });
          added++;
        } catch (e) {
          toast(f.name + ": " + e.message, true);
        }
      }
      if (added) toast(`Додано ${added} фото. Не забудьте опублікувати.`);
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

  // ── render ──
  function render() {
    ["teachers", "prices", "gallery"].forEach((t) => ($(t + "View").hidden = state.tab !== t));
    document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
    const y = window.scrollY;
    if (state.tab === "teachers") renderTeachers();
    if (state.tab === "prices") renderPrices();
    if (state.tab === "gallery") renderGallery();
    window.scrollTo(0, y);
  }

  // ── publish ──
  async function publish() {
    const btn = $("publishBtn");
    btn.disabled = true;
    btn.textContent = "Публікую…";
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
      for (const path of Object.keys(state.pending)) {
        if (!now.has(path)) continue;
        const blob = await gh("/git/blobs", { method: "POST", body: { content: state.pending[path].base64, encoding: "base64" } });
        tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
      }
      const contentBlob = await gh("/git/blobs", { method: "POST", body: { content: utf8ToB64(serializeContent(state.content)), encoding: "base64" } });
      tree.push({ path: CONTENT_PATH, mode: "100644", type: "blob", sha: contentBlob.sha });
      before.forEach((path) => {
        if (!now.has(path) && DELETABLE.test(path) && !state.pending[path]) tree.push({ path, mode: "100644", type: "blob", sha: null });
      });

      const newTree = await gh("/git/trees", { method: "POST", body: { base_tree: headCommit.tree.sha, tree } });
      const commit = await gh("/git/commits", { method: "POST", body: { message: "Оновлення контенту через адмінку", tree: newTree.sha, parents: [headSha] } });
      await gh("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: commit.sha } });

      const fresh = await fetchContentFile();
      state.contentSha = fresh.sha;
      state.original = clone(state.content);
      state.pending = {};
      try { localStorage.removeItem(PREVIEW_KEY); } catch (e) {}
      toast("Опубліковано! Сайт оновиться приблизно за 1–2 хвилини.");
      render();
    } catch (e) {
      console.error(e);
      toast(e.status === 401 || e.status === 403 ? "GitHub не дозволив запис. Перевірте, що ключ має доступ Contents: Read and write." : "Не вдалося опублікувати: " + e.message, true);
    } finally {
      btn.textContent = "Опублікувати на сайті";
      updateSavebar();
    }
  }

  function preview() {
    const c = clone(state.content);
    const swap = (p) => (state.pending[p] ? state.pending[p].dataUrl : p);
    c.teachers.forEach((t) => (t.photo = swap(t.photo)));
    c.gallery.photos.forEach((p) => (p.src = swap(p.src)));
    try {
      localStorage.setItem(PREVIEW_KEY, JSON.stringify(c));
    } catch (e) {
      // too many new photos for browser storage: preview without them
      Object.keys(state.pending).length && toast("Нових фото забагато для перегляду, вони не покажуться.", true);
      const lite = clone(state.content);
      try { localStorage.setItem(PREVIEW_KEY, JSON.stringify(lite)); } catch (e2) { return toast("Не вдалося зробити перегляд.", true); }
    }
    window.open("../?preview=1", "_blank");
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
    ["teachers", "prices", "gallery"].forEach((t) => ($(t + "View").hidden = true));
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
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("modal").hidden) closeModal(); });
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
