// Photo editor for the admin: crop to a frame, zoom, move, centre, rotate, flip,
// brightness / contrast / saturation. No dependencies.
// PhotoEditor.open(src, { title, aspects: [[label, ratio|null]], aspect, maxSide })
//   → Promise<{ dataUrl, base64 } | null>   (null = cancelled)
(function () {
  "use strict";

  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().forEach((c) => c != null && e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }

  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      if (!/^data:|^blob:/.test(src)) i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Не вдалося відкрити фото"));
      i.src = src;
    });
  }

  async function open(src, opts) {
    opts = opts || {};
    const img = await loadImg(src);
    const aspects = opts.aspects || [["Оригінал", null], ["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["16:9", 16 / 9]];
    const maxSide = opts.maxSide || 1600;

    const st = {
      aspect: opts.aspect === undefined ? aspects[0][1] : opts.aspect,
      zoom: 1, // 1 = image just covers the frame
      ox: 0, // image centre offset from frame centre, in frame pixels
      oy: 0,
      rot: 0,
      flip: false,
      bright: 100,
      contrast: 100,
      sat: 100,
      clarity: 0, // -100..100 (local sharpness; minus = softer)
      grain: 0, // 0..100
      shadows: 0, // -100..100 (plus = lighter shadows)
    };

    return new Promise((resolve) => {
      const canvas = el("canvas", { class: "pe-canvas" });
      const ctx = canvas.getContext("2d");
      const stage = el("div", { class: "pe-stage" }, canvas);

      const rotW = () => (st.rot % 180 === 0 ? img.naturalWidth : img.naturalHeight);
      const rotH = () => (st.rot % 180 === 0 ? img.naturalHeight : img.naturalWidth);
      const frameAspect = () => st.aspect || rotW() / rotH();

      // frame rectangle inside the canvas (CSS pixels)
      let F = { x: 0, y: 0, w: 1, h: 1 };
      let dpr = 1;
      function layout() {
        const bw = stage.clientWidth || 600;
        const bh = stage.clientHeight || 420;
        dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(bw * dpr);
        canvas.height = Math.round(bh * dpr);
        canvas.style.width = bw + "px";
        canvas.style.height = bh + "px";
        const pad = 24;
        const a = frameAspect();
        let w = bw - pad * 2;
        let hh = w / a;
        if (hh > bh - pad * 2) {
          hh = bh - pad * 2;
          w = hh * a;
        }
        F = { x: (bw - w) / 2, y: (bh - hh) / 2, w, h: hh };
        clamp();
        draw();
      }
      const coverScale = () => Math.max(F.w / rotW(), F.h / rotH());
      const scale = () => coverScale() * st.zoom;
      function clamp() {
        const s = scale();
        const iw = rotW() * s;
        const ih = rotH() * s;
        const mx = Math.max(0, (iw - F.w) / 2);
        const my = Math.max(0, (ih - F.h) / 2);
        st.ox = Math.min(mx, Math.max(-mx, st.ox));
        st.oy = Math.min(my, Math.max(-my, st.oy));
      }
      function filterStr() {
        return `brightness(${st.bright}%) contrast(${st.contrast}%) saturate(${st.sat}%)`;
      }
      // draw the image into ctx so that the frame (fx,fy,fw,fh) maps as on screen, multiplied by k
      function paint(c, k, fx, fy, fw, fh) {
        const s = scale() * k;
        c.save();
        c.filter = filterStr();
        c.translate(fx + fw / 2 + st.ox * k, fy + fh / 2 + st.oy * k);
        c.rotate((st.rot * Math.PI) / 180);
        if (st.flip) c.scale(-1, 1);
        c.drawImage(img, (-img.naturalWidth * s) / 2, (-img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
        c.restore();
      }
      // pixel effects on a region of a canvas (device pixels): shadows, clarity, grain
      function applyFx(c, x, y, w, h) {
        x = Math.max(0, Math.round(x)); y = Math.max(0, Math.round(y));
        w = Math.min(c.canvas.width - x, Math.round(w)); h = Math.min(c.canvas.height - y, Math.round(h));
        if (w < 2 || h < 2 || (!st.clarity && !st.grain && !st.shadows)) return;
        const id = c.getImageData(x, y, w, h);
        const d = id.data;
        let blur = null;
        if (st.clarity) {
          const t = document.createElement("canvas");
          t.width = w; t.height = h;
          const tc = t.getContext("2d");
          const r = Math.max(1, Math.min(w, h) * 0.006);
          tc.filter = `blur(${r.toFixed(2)}px)`;
          tc.drawImage(c.canvas, x, y, w, h, 0, 0, w, h);
          blur = tc.getImageData(0, 0, w, h).data;
        }
        const sh = st.shadows / 100, cl = st.clarity / 100 * (st.clarity > 0 ? 1.1 : 1), gr = st.grain / 100 * 70;
        const lut = new Float32Array(256);
        for (let v = 0; v < 256; v++) { const q = 1 - v / 255; lut[v] = sh * 110 * q * q * (v / 255 + 0.15); }
        const gs = Math.max(1, Math.round(Math.min(w, h) / 700)); // grain size grows with the picture
        for (let yy = 0; yy < h; yy++) {
          for (let xx = 0; xx < w; xx++) {
            const i = (yy * w + xx) * 4;
            let r = d[i], g = d[i + 1], b = d[i + 2];
            if (blur) { r += cl * (r - blur[i]); g += cl * (g - blur[i + 1]); b += cl * (b - blur[i + 2]); }
            if (sh) { const L = Math.max(0, Math.min(255, (r * 0.3 + g * 0.59 + b * 0.11) | 0)); const a = lut[L]; r += a; g += a; b += a; }
            if (gr) {
              let n = (((xx / gs) | 0) * 374761393 + ((yy / gs) | 0) * 668265263) ^ 0x5bd1e995;
              n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
              const a = ((n & 1023) / 1023 - 0.5) * gr; r += a; g += a; b += a;
            }
            d[i] = r; d[i + 1] = g; d[i + 2] = b; // clamped automatically
          }
        }
        c.putImageData(id, x, y);
      }
      function draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const bw = canvas.width / dpr;
        const bh = canvas.height / dpr;
        ctx.clearRect(0, 0, bw, bh);
        ctx.fillStyle = "#050505";
        ctx.fillRect(0, 0, bw, bh);
        paint(ctx, 1, F.x, F.y, F.w, F.h);
        applyFx(ctx, F.x * dpr, F.y * dpr, F.w * dpr, F.h * dpr);
        // dim outside the frame
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.beginPath();
        ctx.rect(0, 0, bw, bh);
        ctx.rect(F.x, F.y, F.w, F.h);
        ctx.fill("evenodd");
        // frame + rule of thirds
        ctx.strokeStyle = "rgba(0,196,179,0.95)";
        ctx.lineWidth = 2;
        ctx.strokeRect(F.x, F.y, F.w, F.h);
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 3; i++) {
          ctx.moveTo(F.x + (F.w * i) / 3, F.y);
          ctx.lineTo(F.x + (F.w * i) / 3, F.y + F.h);
          ctx.moveTo(F.x, F.y + (F.h * i) / 3);
          ctx.lineTo(F.x + F.w, F.y + (F.h * i) / 3);
        }
        ctx.stroke();
        zoomInput.value = String(st.zoom);
        zoomLabel.textContent = Math.round(st.zoom * 100) + "%";
      }

      // dragging
      let drag = null;
      canvas.addEventListener("pointerdown", (e) => {
        drag = { x: e.clientX, y: e.clientY, ox: st.ox, oy: st.oy };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        st.ox = drag.ox + (e.clientX - drag.x);
        st.oy = drag.oy + (e.clientY - drag.y);
        clamp();
        draw();
      });
      const endDrag = () => (drag = null);
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
      canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          setZoom(st.zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
        },
        { passive: false }
      );
      function setZoom(z) {
        const old = st.zoom;
        st.zoom = Math.min(5, Math.max(1, z));
        st.ox *= st.zoom / old;
        st.oy *= st.zoom / old;
        clamp();
        draw();
      }

      // controls
      const zoomInput = el("input", { type: "range", min: "1", max: "5", step: "0.01", value: "1", id: "peZoom" });
      zoomInput.addEventListener("input", () => setZoom(Number(zoomInput.value)));
      const zoomLabel = el("span", { class: "pe-val" }, "100%");

      const aspectRow = el("div", { class: "pe-chips" });
      function drawAspects() {
        aspectRow.innerHTML = "";
        aspects.forEach(([label, r]) => {
          aspectRow.appendChild(
            el("button", { type: "button", class: "pe-chip" + (st.aspect === r ? " on" : ""), title: r ? "Обрізати фото під цю форму" : "Залишити форму фото як є", onclick: () => { st.aspect = r; drawAspects(); layout(); } }, label)
          );
        });
      }
      drawAspects();

      function slider(label, key, min, max, signed) {
        const fmt = (v) => (signed ? (v > 0 ? "+" : "") + v : v + "%");
        const val = el("span", { class: "pe-val" }, fmt(st[key]));
        const input = el("input", { type: "range", min: String(min), max: String(max), step: "1", value: String(st[key]) });
        input.addEventListener("input", () => {
          st[key] = Number(input.value);
          val.textContent = fmt(st[key]);
          draw();
        });
        slider.all = slider.all || [];
        slider.all.push(() => { input.value = String(st[key]); val.textContent = fmt(st[key]); });
        return el("label", { class: "pe-slider" }, el("span", null, label), input, val);
      }

      const box = el(
        "div",
        { class: "pe-box", role: "dialog", "aria-modal": "true" },
        el("div", { class: "pe-head" }, el("h3", null, opts.title || "Редагування фото"), el("span", { class: "pe-hint" }, "Перетягніть фото, щоб посунути. Колесо миші або повзунок наближає.")),
        stage,
        el(
          "div",
          { class: "pe-controls" },
          el("div", { class: "pe-group" }, el("span", { class: "pe-label" }, "Кадр"), aspectRow),
          el(
            "div",
            { class: "pe-group" },
            el("span", { class: "pe-label" }, "Масштаб"),
            el("div", { class: "pe-zoom" }, el("button", { type: "button", class: "pe-btn", title: "Віддалити", onclick: () => setZoom(st.zoom / 1.15) }, "−"), zoomInput, el("button", { type: "button", class: "pe-btn", title: "Наблизити", onclick: () => setZoom(st.zoom * 1.15) }, "+"), zoomLabel)
          ),
          el(
            "div",
            { class: "pe-group" },
            el("span", { class: "pe-label" }, "Положення"),
            el(
              "div",
              { class: "pe-chips" },
              el("button", { type: "button", class: "pe-chip", title: "Поставити фото по центру кадру", onclick: () => { st.ox = 0; st.oy = 0; clamp(); draw(); } }, "По центру"),
              el("button", { type: "button", class: "pe-chip", title: "Показати верхню частину фото", onclick: () => { st.oy = 1e6; clamp(); draw(); } }, "Верх"),
              el("button", { type: "button", class: "pe-chip", title: "Показати нижню частину фото", onclick: () => { st.oy = -1e6; clamp(); draw(); } }, "Низ"),
              el("button", { type: "button", class: "pe-chip", title: "Повернути вліво", onclick: () => { st.rot = (st.rot + 270) % 360; st.ox = st.oy = 0; layout(); } }, "⟲ Повернути"),
              el("button", { type: "button", class: "pe-chip", title: "Повернути вправо", onclick: () => { st.rot = (st.rot + 90) % 360; st.ox = st.oy = 0; layout(); } }, "⟳"),
              el("button", { type: "button", class: "pe-chip", title: "Віддзеркалити зліва направо", onclick: () => { st.flip = !st.flip; draw(); } }, "⇋ Віддзеркалити")
            )
          ),
          el("div", { class: "pe-group pe-filters" }, el("span", { class: "pe-label" }, "Колір"), slider("Яскравість", "bright", 50, 150), slider("Контраст", "contrast", 50, 150), slider("Насиченість", "sat", 0, 200)),
          el("div", { class: "pe-group pe-filters" }, el("span", { class: "pe-label" }, "Деталі"), slider("Чіткість", "clarity", -100, 100, true), slider("Тіні", "shadows", -100, 100, true), slider("Зернистість", "grain", 0, 100, true))
        ),
        el(
          "div",
          { class: "pe-actions" },
          el("button", { type: "button", class: "btn btn-ghost", onclick: reset }, "Скинути"),
          el("span", { class: "pe-spacer" }),
          el("button", { type: "button", class: "btn btn-ghost", onclick: () => finish(null) }, "Скасувати"),
          el("button", { type: "button", class: "btn btn-teal", onclick: save }, "Зберегти фото")
        )
      );
      const overlay = el("div", { class: "pe-overlay" }, box);

      function reset() {
        Object.assign(st, { aspect: opts.aspect === undefined ? aspects[0][1] : opts.aspect, zoom: 1, ox: 0, oy: 0, rot: 0, flip: false, bright: 100, contrast: 100, sat: 100, clarity: 0, grain: 0, shadows: 0 });
        (slider.all || []).forEach((f) => f());
        drawAspects();
        layout();
      }
      function save() {
        // output size: the frame in source pixels, capped at maxSide
        const srcW = F.w / scale();
        const srcH = F.h / scale();
        const k0 = Math.min(1, maxSide / Math.max(srcW, srcH));
        const outW = Math.max(1, Math.round(srcW * k0));
        const outH = Math.max(1, Math.round(srcH * k0));
        const out = document.createElement("canvas");
        out.width = outW;
        out.height = outH;
        const c = out.getContext("2d");
        c.fillStyle = "#000";
        c.fillRect(0, 0, outW, outH);
        paint(c, outW / F.w, 0, 0, outW, outH);
        applyFx(c, 0, 0, outW, outH);
        const dataUrl = out.toDataURL("image/jpeg", 0.86);
        finish({ dataUrl, base64: dataUrl.split(",")[1] });
      }
      function onKey(e) {
        if (e.key === "Escape") { e.stopImmediatePropagation(); finish(null); }
      }
      function finish(result) {
        window.removeEventListener("resize", layout);
        document.removeEventListener("keydown", onKey, true);
        overlay.remove();
        resolve(result);
      }

      document.body.appendChild(overlay);
      window.addEventListener("resize", layout);
      document.addEventListener("keydown", onKey, true);
      requestAnimationFrame(layout);
    });
  }

  window.PhotoEditor = { open };
})();
