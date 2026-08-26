(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const imageCanvas = $("#imageCanvas");
  const overlayCanvas = $("#overlayCanvas");
  const imageContext = imageCanvas.getContext("2d");
  const overlayContext = overlayCanvas.getContext("2d");
  const sourceImage = new Image();

  const state = {
    filename: "image.png",
    masks: [],
    redo: [],
    words: [],
    draft: null,
    start: null,
    drawing: false,
    tool: "rectangle",
    effect: "mosaic",
    mosaicSize: 14,
    blurSize: 18,
    solidColor: "#111827",
    brushSize: 36,
    zoom: 1,
    mosaicCanvas: null,
    mosaicKey: ""
  };

  Promise.all([fetch("./config").then((response) => response.json()), loadImage("./source")])
    .then(([config]) => {
      state.filename = config.filename;
      $("#filename").textContent = config.filename;
      setupCanvas();
      bindControls();
    })
    .catch((error) => {
      $("#loading").textContent = `Could not load image: ${error.message}`;
    });

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      sourceImage.onload = resolve;
      sourceImage.onerror = () => reject(new Error("The browser cannot decode this image format."));
      sourceImage.src = url;
    });
  }

  function setupCanvas() {
    const { naturalWidth: width, naturalHeight: height } = sourceImage;
    for (const canvas of [imageCanvas, overlayCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
    $("#dimensions").textContent = `${width} × ${height}px`;
    $("#loading").hidden = true;
    $("#canvasStack").hidden = false;
    fitCanvas();
    render();
  }

  function bindControls() {
    $$(".tool").forEach((button) => {
      button.addEventListener("click", () => setTool(button.dataset.tool));
    });
    $("#effect").addEventListener("change", (event) => {
      state.effect = event.target.value;
      $("#mosaicOptions").hidden = state.effect !== "mosaic";
      $("#blurOptions").hidden = state.effect !== "blur";
      $("#solidOptions").hidden = state.effect !== "solid";
    });
    bindRange("#mosaicSize", "#mosaicValue", (value) => {
      state.mosaicSize = value;
      state.mosaicCanvas = null;
      render();
    });
    bindRange("#blurSize", "#blurValue", (value) => { state.blurSize = value; render(); });
    bindRange("#brushSize", "#brushValue", (value) => { state.brushSize = value; });
    $("#solidColor").addEventListener("input", (event) => { state.solidColor = event.target.value; render(); });

    overlayCanvas.addEventListener("pointerdown", pointerDown);
    overlayCanvas.addEventListener("pointermove", pointerMove);
    overlayCanvas.addEventListener("pointerup", pointerUp);
    overlayCanvas.addEventListener("pointercancel", pointerUp);
    $("#undoButton").addEventListener("click", undo);
    $("#redoButton").addEventListener("click", redo);
    $("#clearButton").addEventListener("click", clearAll);
    $("#detectTextButton").addEventListener("click", detectText);
    $("#saveButton").addEventListener("click", () => saveCanvas(imageCanvas, "redacted"));
    $("#copyButton").addEventListener("click", copyCanvas);
    $("#frameButton").addEventListener("click", saveFramed);
    $("#zoomIn").addEventListener("click", () => setZoom(state.zoom + .1));
    $("#zoomOut").addEventListener("click", () => setZoom(state.zoom - .1));
    $("#fitButton").addEventListener("click", fitCanvas);
    window.addEventListener("resize", () => { if (state.zoom < 1) fitCanvas(); });
    window.addEventListener("keydown", keyboardShortcuts);
    $("aside").addEventListener("scroll", updateScrollHint);
    updateScrollHint();
  }

  function bindRange(inputSelector, outputSelector, onInput) {
    $(inputSelector).addEventListener("input", (event) => {
      const value = Number(event.target.value);
      $(outputSelector).textContent = `${value} px`;
      onInput(value);
    });
  }

  function setTool(tool) {
    state.tool = tool;
    $$(".tool").forEach((button) => {
      const active = button.dataset.tool === tool;
      button.classList.toggle("active", active);
      button.setAttribute("aria-checked", String(active));
    });
    $("#paintOptions").hidden = tool !== "paint";
    overlayCanvas.style.cursor = tool === "paint" ? "crosshair" : "crosshair";
    drawOverlay();
  }

  function pointerDown(event) {
    if (event.button !== 0) return;
    overlayCanvas.setPointerCapture(event.pointerId);
    state.drawing = true;
    state.start = canvasPoint(event);
    if (state.tool === "paint" || state.tool === "freeform") {
      state.draft = makeMask("path", { points: [state.start], closed: state.tool === "freeform", width: state.brushSize });
    } else {
      state.draft = makeMask("rect", { x: state.start.x, y: state.start.y, width: 0, height: 0, ellipse: state.tool === "circle", selection: state.tool === "text" });
    }
    drawOverlay();
  }

  function pointerMove(event) {
    if (!state.drawing || !state.draft) return;
    const point = canvasPoint(event);
    if (state.draft.type === "path") {
      const previous = state.draft.points[state.draft.points.length - 1];
      if (Math.hypot(point.x - previous.x, point.y - previous.y) > 2 / state.zoom) state.draft.points.push(point);
    } else {
      state.draft.width = point.x - state.start.x;
      state.draft.height = point.y - state.start.y;
    }
    drawOverlay();
  }

  function pointerUp(event) {
    if (!state.drawing || !state.draft) return;
    state.drawing = false;
    if (overlayCanvas.hasPointerCapture(event.pointerId)) overlayCanvas.releasePointerCapture(event.pointerId);

    if (state.tool === "text") {
      const selection = normalizedRect(state.draft);
      const selected = state.words.filter((word) => intersects(selection, word));
      if (selected.length) {
        selected.forEach((word) => addMask(makeMask("rect", { ...word, ellipse: false })));
        toast(`${selected.length} text region${selected.length === 1 ? "" : "s"} redacted`);
      } else {
        toast(state.words.length ? "No detected text in that area" : "Run Detect Text first");
      }
    } else if (validDraft(state.draft)) {
      if (state.draft.type === "rect") Object.assign(state.draft, normalizedRect(state.draft));
      addMask(state.draft);
    }
    state.draft = null;
    state.start = null;
    render();
  }

  function makeMask(type, values) {
    return {
      type,
      effect: state.effect,
      mosaicSize: state.mosaicSize,
      blurSize: state.blurSize,
      color: state.solidColor,
      ...values
    };
  }

  function addMask(mask) {
    state.masks.push(mask);
    state.redo = [];
    updateHistory();
  }

  function validDraft(mask) {
    if (mask.type === "path") return mask.points.length > 1;
    return Math.abs(mask.width) > 3 && Math.abs(mask.height) > 3;
  }

  function canvasPoint(event) {
    const rect = overlayCanvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) * (overlayCanvas.width / rect.width), 0, overlayCanvas.width),
      y: clamp((event.clientY - rect.top) * (overlayCanvas.height / rect.height), 0, overlayCanvas.height)
    };
  }

  function normalizedRect(rect) {
    return {
      x: rect.width < 0 ? rect.x + rect.width : rect.x,
      y: rect.height < 0 ? rect.y + rect.height : rect.y,
      width: Math.abs(rect.width),
      height: Math.abs(rect.height)
    };
  }

  function intersects(a, b) {
    return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  }

  function render() {
    if (!sourceImage.complete || !sourceImage.naturalWidth) return;
    imageContext.clearRect(0, 0, imageCanvas.width, imageCanvas.height);
    imageContext.drawImage(sourceImage, 0, 0);
    state.masks.forEach((mask) => applyMask(imageContext, mask));
    drawOverlay();
    updateHistory();
  }

  function applyMask(context, mask) {
    if (mask.type === "path" && !mask.closed) {
      const layer = document.createElement("canvas");
      layer.width = imageCanvas.width;
      layer.height = imageCanvas.height;
      const layerContext = layer.getContext("2d");
      drawEffect(layerContext, mask);
      layerContext.globalCompositeOperation = "destination-in";
      layerContext.strokeStyle = "#000";
      layerContext.lineCap = "round";
      layerContext.lineJoin = "round";
      layerContext.lineWidth = mask.width;
      maskPath(layerContext, mask);
      layerContext.stroke();
      context.drawImage(layer, 0, 0);
      return;
    }

    context.save();
    maskPath(context, mask);
    context.clip();
    drawEffect(context, mask);
    context.restore();
  }

  function drawEffect(context, mask) {
    if (mask.effect === "solid") {
      context.fillStyle = mask.color;
      context.fillRect(0, 0, imageCanvas.width, imageCanvas.height);
    } else if (mask.effect === "blur") {
      context.filter = `blur(${mask.blurSize}px)`;
      context.drawImage(sourceImage, 0, 0);
      context.filter = "none";
    } else {
      context.imageSmoothingEnabled = false;
      context.drawImage(getMosaic(mask.mosaicSize), 0, 0, imageCanvas.width, imageCanvas.height);
    }
  }

  function getMosaic(size) {
    const key = `${imageCanvas.width}:${imageCanvas.height}:${size}`;
    if (state.mosaicCanvas && state.mosaicKey === key) return state.mosaicCanvas;
    const tiny = document.createElement("canvas");
    tiny.width = Math.max(1, Math.ceil(imageCanvas.width / size));
    tiny.height = Math.max(1, Math.ceil(imageCanvas.height / size));
    const context = tiny.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.drawImage(sourceImage, 0, 0, tiny.width, tiny.height);
    state.mosaicCanvas = tiny;
    state.mosaicKey = key;
    return tiny;
  }

  function maskPath(context, mask) {
    context.beginPath();
    if (mask.type === "rect") {
      if (mask.ellipse) context.ellipse(mask.x + mask.width / 2, mask.y + mask.height / 2, Math.abs(mask.width / 2), Math.abs(mask.height / 2), 0, 0, Math.PI * 2);
      else context.rect(mask.x, mask.y, mask.width, mask.height);
    } else if (mask.points.length) {
      context.moveTo(mask.points[0].x, mask.points[0].y);
      mask.points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
      if (mask.closed) context.closePath();
    }
  }

  function drawOverlay() {
    overlayContext.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    if (state.tool === "text") {
      overlayContext.save();
      overlayContext.fillStyle = "rgba(124, 92, 255, .13)";
      overlayContext.strokeStyle = "rgba(155, 135, 255, .72)";
      overlayContext.lineWidth = Math.max(1, 1.2 / state.zoom);
      state.words.forEach((word) => {
        overlayContext.fillRect(word.x, word.y, word.width, word.height);
        overlayContext.strokeRect(word.x, word.y, word.width, word.height);
      });
      overlayContext.restore();
    }
    [...state.masks, ...(state.draft ? [state.draft] : [])].forEach((mask, index, all) => {
      overlayContext.save();
      overlayContext.strokeStyle = mask.selection ? "#9b87ff" : "#ff5874";
      overlayContext.fillStyle = mask.selection ? "rgba(124,92,255,.12)" : "rgba(255,88,116,.08)";
      overlayContext.lineWidth = Math.max(1.5, 2 / state.zoom);
      overlayContext.setLineDash([7 / state.zoom, 5 / state.zoom]);
      maskPath(overlayContext, mask);
      if (mask.type === "rect" || mask.closed) {
        overlayContext.fill();
        overlayContext.stroke();
      } else {
        overlayContext.setLineDash([]);
        overlayContext.globalAlpha = index === all.length - 1 && state.draft ? .55 : .28;
        overlayContext.lineCap = "round";
        overlayContext.lineJoin = "round";
        overlayContext.lineWidth = mask.width;
        overlayContext.stroke();
      }
      overlayContext.restore();
    });
  }

  function undo() {
    const mask = state.masks.pop();
    if (mask) state.redo.push(mask);
    render();
  }

  function redo() {
    const mask = state.redo.pop();
    if (mask) state.masks.push(mask);
    render();
  }

  function clearAll() {
    if (!state.masks.length || !confirm("Remove every redaction?")) return;
    state.redo.push(...state.masks.reverse());
    state.masks = [];
    render();
  }

  function updateHistory() {
    $("#undoButton").disabled = !state.masks.length;
    $("#redoButton").disabled = !state.redo.length;
    $("#clearButton").disabled = !state.masks.length;
    $("#maskCount").textContent = `${state.masks.length} redaction${state.masks.length === 1 ? "" : "s"}`;
  }

  async function detectText() {
    const button = $("#detectTextButton");
    const progress = $("#ocrProgress");
    if (!window.Tesseract) {
      toast("Text detector could not load. Check your internet connection.");
      return;
    }
    button.disabled = true;
    progress.hidden = false;
    try {
      const result = await window.Tesseract.recognize(sourceImage, "eng", {
        logger(message) {
          if (typeof message.progress === "number") $("#ocrProgressBar").style.width = `${Math.round(message.progress * 100)}%`;
          $("#ocrStatus").textContent = sentenceCase(message.status || "Detecting text…");
        }
      });
      state.words = (result.data.words || []).filter((word) => word.confidence > 35).map((word) => ({
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
        text: word.text
      }));
      setTool("text");
      toast(`Detected ${state.words.length} text region${state.words.length === 1 ? "" : "s"}`);
    } catch (error) {
      toast(`Text detection failed: ${error.message || error}`);
    } finally {
      button.disabled = false;
      progress.hidden = true;
      $("#ocrProgressBar").style.width = "0";
    }
  }

  async function saveCanvas(canvas, suffix) {
    try {
      const blob = await canvasBlob(canvas);
      downloadBlob(blob, outputName(suffix));
      toast("New PNG saved — original unchanged");
    } catch (error) {
      toast(`Could not save PNG: ${error.message || error}`);
    }
  }

  async function copyCanvas() {
    try {
      const blob = await canvasBlob(imageCanvas);
      if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("Clipboard image access is unavailable in this browser");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Redacted PNG copied");
    } catch (error) {
      toast(`${error.message || error}. Use Save PNG instead.`);
    }
  }

  async function saveFramed() {
    const padding = Math.max(72, Math.round(Math.min(imageCanvas.width, imageCanvas.height) * .09));
    const frame = document.createElement("canvas");
    frame.width = imageCanvas.width + padding * 2;
    frame.height = imageCanvas.height + padding * 2;
    const context = frame.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, frame.width, frame.height);
    const colors = frameColors($("#frameStyle").value);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, frame.width, frame.height);

    const radius = Math.max(12, Math.min(28, padding * .22));
    context.save();
    if ($("#frameShadow").checked) {
      context.shadowColor = "rgba(0, 0, 0, .42)";
      context.shadowBlur = Math.max(22, padding * .38);
      context.shadowOffsetY = Math.max(8, padding * .12);
    }
    roundedRect(context, padding, padding, imageCanvas.width, imageCanvas.height, radius);
    context.fillStyle = "#fff";
    context.fill();
    context.restore();
    context.save();
    roundedRect(context, padding, padding, imageCanvas.width, imageCanvas.height, radius);
    context.clip();
    context.drawImage(imageCanvas, padding, padding);
    context.restore();
    await saveCanvas(frame, "redacted-framed");
  }

  function frameColors(style) {
    return {
      violet: ["#3b1d78", "#c6477b"],
      sunset: ["#ff7a59", "#682c91"],
      ocean: ["#075985", "#22d3ee"],
      graphite: ["#111827", "#475569"],
      paper: ["#e7e5e4", "#a8a29e"]
    }[style];
  }

  function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG encoding failed")), "image/png"));
  }

  function downloadBlob(blob, filename) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2_000);
  }

  function outputName(suffix) {
    const base = state.filename.replace(/\.[^.]+$/, "") || "image";
    return `${base}_${suffix}.png`;
  }

  function fitCanvas() {
    const viewport = $("#canvasViewport");
    const fit = Math.min(1, (viewport.clientWidth - 64) / imageCanvas.width, (viewport.clientHeight - 64) / imageCanvas.height);
    setZoom(fit);
  }

  function setZoom(value) {
    state.zoom = clamp(value, .1, 2);
    const stack = $("#canvasStack");
    stack.style.width = `${Math.round(imageCanvas.width * state.zoom)}px`;
    stack.style.height = `${Math.round(imageCanvas.height * state.zoom)}px`;
    $("#zoomValue").textContent = `${Math.round(state.zoom * 100)}%`;
    drawOverlay();
  }

  function keyboardShortcuts(event) {
    const modifier = event.metaKey || event.ctrlKey;
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
    } else if (modifier && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void saveCanvas(imageCanvas, "redacted");
    } else if (event.key === "Escape" && state.draft) {
      state.draft = null;
      state.drawing = false;
      drawOverlay();
    }
  }

  function updateScrollHint() {
    const aside = $("aside");
    $("#scrollHint").classList.toggle("done", aside.scrollTop + aside.clientHeight >= aside.scrollHeight - 8);
  }

  let toastTimer;
  function toast(message) {
    const element = $("#toast");
    element.textContent = message;
    element.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove("show"), 3_200);
  }

  function sentenceCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
