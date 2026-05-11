/* -----------------------------------------
   No Prompt for Breath - App Logic
   Avery Lake, 2026
----------------------------------------- */

const experience      = document.querySelector("#experience");
const homeButton      = document.querySelector("#home-button");
const actionButton    = document.querySelector("#action-button");
const imageField      = document.querySelector("#image-field");
const sourceImage     = document.querySelector("#source-image");
const blueprintCanvas = document.querySelector("#blueprint-canvas");
const artifactLink    = document.querySelector("#artifact-link");
const printInquiry    = document.querySelector("#print-inquiry");
const printInquiryLink = document.querySelector("#print-inquiry-link");
const statementButton = document.querySelector("#statement-button");
const artistStatement = document.querySelector("#artist-statement");
const inappNotice     = document.querySelector("#inapp-notice");
const inappClose      = document.querySelector("#inapp-close");
const inappUrl        = document.querySelector("#inapp-url");

const states = ["image", "reading", "scanned"];
const readingRows = [
  ["image",    "plausible"],
  ["bird",     "detected"],
  ["cage",     "detected"],
  ["relation", "above"],
  ["door",     "open"],
  ["symbol",   "freedom"],
  ["air",      "unregistered"],
  ["breath",   "no prompt"],
];

const assetVersion = "20260511-inapp-download";
let state             = "image";
let readingTimer      = 0;
let blueprintReady    = false;
let blueprintBuilding = false;
let artifactUrl       = "";
const readingDuration = 6900;

/* State machine */
function setState(nextState) {
  state = nextState;
  experience.classList.remove(...states.map((name) => `state-${name}`));
  experience.classList.add(`state-${nextState}`);

  if (nextState === "image") {
    actionButton.hidden = false;
    actionButton.setAttribute("aria-hidden", "false");
    actionButton.textContent = "Scan image";
    actionButton.disabled = false;
    clearArtifact();
  }

  if (nextState === "reading") {
    actionButton.hidden = false;
    actionButton.setAttribute("aria-hidden", "false");
    actionButton.textContent = "Scanning";
    actionButton.disabled = true;
  }

  if (nextState === "scanned") {
    actionButton.hidden = true;
    actionButton.setAttribute("aria-hidden", "true");
    createArtifact();
  }
}

/* Blueprint builder */
function buildBlueprint() {
  if (!sourceImage || !blueprintCanvas || blueprintReady || blueprintBuilding) return blueprintReady;
  if (!sourceImage.complete || !sourceImage.naturalWidth || !sourceImage.naturalHeight) return false;

  blueprintBuilding = true;

  const width  = sourceImage.naturalWidth  || 1200;
  const height = sourceImage.naturalHeight || 1500;
  const scale  = Math.min(1, 1200 / width);
  const canvasWidth  = Math.round(width  * scale);
  const canvasHeight = Math.round(height * scale);

  blueprintCanvas.width  = canvasWidth;
  blueprintCanvas.height = canvasHeight;
  const blueprintContext = blueprintCanvas.getContext("2d");

  /* Attempt Sobel edge detection; fall back to a synthetic grid if needed. */
  try {
    const sourceCanvas  = document.createElement("canvas");
    sourceCanvas.width  = canvasWidth;
    sourceCanvas.height = canvasHeight;
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(sourceImage, 0, 0, canvasWidth, canvasHeight);

    const sourceData = sourceContext.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels     = sourceData.data;
    const gray       = new Uint8ClampedArray(canvasWidth * canvasHeight);

    for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
      gray[p] = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
    }

    const blueprint = blueprintContext.createImageData(canvasWidth, canvasHeight);
    const output    = blueprint.data;

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const pixel = y * canvasWidth + x;
        const gx =
          -valueAt(gray, canvasWidth, canvasHeight, x - 1, y - 1) +
           valueAt(gray, canvasWidth, canvasHeight, x + 1, y - 1) +
          -2 * valueAt(gray, canvasWidth, canvasHeight, x - 1, y) +
           2 * valueAt(gray, canvasWidth, canvasHeight, x + 1, y) +
          -valueAt(gray, canvasWidth, canvasHeight, x - 1, y + 1) +
           valueAt(gray, canvasWidth, canvasHeight, x + 1, y + 1);
        const gy =
          -valueAt(gray, canvasWidth, canvasHeight, x - 1, y - 1) +
          -2 * valueAt(gray, canvasWidth, canvasHeight, x, y - 1) +
          -valueAt(gray, canvasWidth, canvasHeight, x + 1, y - 1) +
           valueAt(gray, canvasWidth, canvasHeight, x - 1, y + 1) +
           2 * valueAt(gray, canvasWidth, canvasHeight, x, y + 1) +
           valueAt(gray, canvasWidth, canvasHeight, x + 1, y + 1);

        const edge      = Math.min(255, Math.hypot(gx, gy) * 1.72);
        const minorGrid = (x % 34 === 0 || y % 34 === 0) ? 12 : 0;
        const majorGrid = (x % 170 === 0 || y % 170 === 0) ? 12 : 0;
        const grid      = minorGrid + majorGrid;
        const line      = edge > 48 ? Math.min(1, (edge - 48) / 90) : 0;
        const idx       = pixel * 4;
        const baseR = 6   + grid;
        const baseG = 55  + grid;
        const baseB = 112 + grid;

        output[idx]     = Math.round(baseR + (247 - baseR) * line);
        output[idx + 1] = Math.round(baseG + (253 - baseG) * line);
        output[idx + 2] = Math.round(baseB + (255 - baseB) * line);
        output[idx + 3] = 255;
      }
    }

    blueprintContext.putImageData(blueprint, 0, 0);
  } catch (_e) {
    /* Synthetic fallback: solid blueprint background + grid */
    blueprintContext.fillStyle = "#063f82";
    blueprintContext.fillRect(0, 0, canvasWidth, canvasHeight);
    blueprintContext.strokeStyle = "rgba(248,253,255,0.045)";
    blueprintContext.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += 34) {
      blueprintContext.beginPath();
      blueprintContext.moveTo(x, 0);
      blueprintContext.lineTo(x, canvasHeight);
      blueprintContext.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 34) {
      blueprintContext.beginPath();
      blueprintContext.moveTo(0, y);
      blueprintContext.lineTo(canvasWidth, y);
      blueprintContext.stroke();
    }
  }

  drawTechnicalLayer(blueprintContext, canvasWidth, canvasHeight);

  blueprintReady    = true;
  blueprintBuilding = false;
  return true;
}

function valueAt(gray, width, height, x, y) {
  const safeX = Math.max(0, Math.min(width  - 1, x));
  const safeY = Math.max(0, Math.min(height - 1, y));
  return gray[safeY * width + safeX];
}

/* Technical overlay */
function drawTechnicalLayer(context, width, height) {
  context.save();
  context.strokeStyle  = "rgba(248,253,255,0.86)";
  context.fillStyle    = "rgba(248,253,255,0.92)";
  context.lineWidth    = Math.max(1, width * 0.0014);
  context.font         = `${Math.max(11, Math.round(width * 0.014))}px Menlo, Consolas, monospace`;
  context.textBaseline = "top";

  drawReadout(context, width, height);
  drawBox(context, width * 0.36, height * 0.06, width * 0.2,  height * 0.18, "BIRD / DETECTED");
  drawBox(context, width * 0.22, height * 0.24, width * 0.56, height * 0.64, "");
  drawBox(context, width * 0.53, height * 0.5,  width * 0.31, height * 0.34, "DOOR / OPEN");
  drawMeasure(context, width * 0.17, height * 0.23, width * 0.17, height * 0.88, "FORM HEIGHT");
  drawMeasure(context, width * 0.22, height * 0.91, width * 0.78, height * 0.91, "BASE WIDTH");
  drawInset(context,   width * 0.68, height * 0.07, width * 0.22, height * 0.12, "FIG. A / AVIAN FORM");
  drawInset(context,   width * 0.68, height * 0.21, width * 0.22, height * 0.12, "FIG. B / OPEN DOOR");

  context.restore();
}

function drawReadout(context, width, height) {
  const x      = width  * 0.055;
  const y      = height * 0.055;
  const rowGap = Math.max(28, height * 0.024);
  const labelW = width  * 0.18;
  context.save();
  context.fillStyle   = "rgba(6,63,130,0.74)";
  context.fillRect(x - 12, y - 12, width * 0.34, rowGap * 10.4);
  context.strokeStyle = "rgba(248,253,255,0.38)";
  context.strokeRect(x - 12, y - 12, width * 0.34, rowGap * 10.4);
  context.fillStyle   = "rgba(248,253,255,0.93)";
  context.font        = `${Math.max(24, Math.round(width * 0.022))}px Menlo, Consolas, monospace`;
  context.fillText("MACHINE READING", x, y);
  context.globalAlpha = 0.92;
  readingRows.forEach(([label, value], i) => {
    const rowY = y + rowGap * (i + 1.55);
    context.fillText(label.toUpperCase(), x, rowY);
    context.fillText(value.toUpperCase(), x + labelW, rowY);
  });
  context.restore();
}

function drawBox(context, x, y, width, height, label) {
  context.strokeRect(x, y, width, height);
  if (label) drawLabel(context, label, x + 8, y + 8);
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + width * 0.1, y - height * 0.06);
  context.moveTo(x + width, y + height);
  context.lineTo(x + width * 0.9, y + height * 1.06);
  context.stroke();
}

function drawLabel(context, label, x, y) {
  context.save();
  const metrics = context.measureText(label);
  context.fillStyle = "rgba(6,63,130,0.78)";
  context.fillRect(x - 5, y - 4, metrics.width + 10, 24);
  context.fillStyle = "rgba(248,253,255,0.94)";
  context.fillText(label, x, y);
  context.restore();
}

function drawMeasure(context, x1, y1, x2, y2, label) {
  context.save();
  context.globalAlpha = 0.78;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  const isVertical = Math.abs(x1 - x2) < Math.abs(y1 - y2);
  if (isVertical) {
    context.beginPath();
    context.moveTo(x1 - 10, y1); context.lineTo(x1 + 10, y1);
    context.moveTo(x2 - 10, y2); context.lineTo(x2 + 10, y2);
    context.stroke();
    context.save();
    context.translate(x1 - 38, (y1 + y2) / 2);
    context.rotate(-Math.PI / 2);
    context.fillText(label, 0, 0);
    context.restore();
  } else {
    context.beginPath();
    context.moveTo(x1, y1 - 10); context.lineTo(x1, y1 + 10);
    context.moveTo(x2, y2 - 10); context.lineTo(x2, y2 + 10);
    context.stroke();
    context.fillText(label, (x1 + x2) / 2 - 42, y1 + 14);
  }
  context.restore();
}

function drawInset(context, x, y, width, height, label) {
  context.save();
  context.globalAlpha = 0.82;
  context.strokeRect(x, y, width, height);
  context.fillText(label, x + 8, y + 8);
  context.beginPath();
  context.moveTo(x + width * 0.16, y + height * 0.72);
  context.bezierCurveTo(
    x + width * 0.34, y + height * 0.24,
    x + width * 0.66, y + height * 0.24,
    x + width * 0.84, y + height * 0.72
  );
  context.moveTo(x + width * 0.5, y + height * 0.2);
  context.lineTo(x + width * 0.5, y + height * 0.84);
  context.stroke();
  context.restore();
}

/* Artifact */
function clearArtifact() {
  if (artifactUrl) { URL.revokeObjectURL(artifactUrl); artifactUrl = ""; }
  artifactLink.hidden = true;
  artifactLink.setAttribute("href", "#");
  artifactLink.setAttribute("aria-disabled", "true");
  if (printInquiry) printInquiry.hidden = true;
}

function createArtifact() {
  if (!blueprintReady || !blueprintCanvas) return;

  const hash = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  const scanImage = new Image();
  scanImage.addEventListener(
    "load",
    () => {
      const artifactCanvas = document.createElement("canvas");
      artifactCanvas.width = scanImage.naturalWidth;
      artifactCanvas.height = scanImage.naturalHeight;
      const context = artifactCanvas.getContext("2d");
      context.drawImage(scanImage, 0, 0);
      drawArtifactEdition(context, artifactCanvas.width, artifactCanvas.height, hash);

      artifactCanvas.toBlob((blob) => {
        if (!blob) {
          showArtifact(`assets/no-prompt-for-breath-scan.png?v=${assetVersion}`, hash);
          return;
        }
        if (artifactUrl) URL.revokeObjectURL(artifactUrl);
        artifactUrl = URL.createObjectURL(blob);
        showArtifact(artifactUrl, hash);
      }, "image/png");
    },
    { once: true }
  );
  scanImage.addEventListener(
    "error",
    () => showArtifact(`assets/no-prompt-for-breath-scan.png?v=${assetVersion}`, hash),
    { once: true }
  );
  scanImage.src = `assets/no-prompt-for-breath-scan.png?v=${assetVersion}`;
}

function drawArtifactEdition(context, width, height, hash) {
  const margin = Math.round(width * 0.055);
  const baseline = height - Math.round(height * 0.035);
  const fontSize = Math.max(18, Math.round(width * 0.018));
  const title = "NO PROMPT FOR BREATH (1/1)";
  const artist = "AVERY LAKE";

  context.save();
  context.fillStyle = "rgba(248,253,255,0.96)";
  context.font = `${fontSize}px Menlo, Consolas, monospace`;
  context.textBaseline = "alphabetic";
  context.shadowColor = "rgba(6,63,130,0.75)";
  context.shadowBlur = Math.round(fontSize * 0.35);
  context.fillText(`HASH ${hash}`, margin, baseline);
  context.textAlign = "center";
  context.fillText(title, width / 2, baseline);
  context.textAlign = "right";
  context.fillText(artist, width - margin, baseline);
  context.restore();
}

function showArtifact(href, hash) {
  artifactLink.href = href;
  artifactLink.download = `no-prompt-for-breath-scan-${hash}.png`;
  artifactLink.hidden = false;
  artifactLink.setAttribute("aria-disabled", "false");
  if (printInquiry) printInquiry.hidden = false;
}

function isEmbeddedSocialBrowser() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|TikTok|musical_ly|Snapchat|Twitter\/|Line\/|Pinterest|Threads/i.test(ua);
}

function publicArtworkUrl() {
  return document.querySelector('link[rel="canonical"]')?.href || window.location.href;
}

function showInappNotice() {
  if (!inappNotice || !inappUrl) return;
  const url = publicArtworkUrl();
  inappUrl.textContent = url;
  inappNotice.hidden = false;
  inappClose?.focus();
}

function hideInappNotice() {
  if (inappNotice) inappNotice.hidden = true;
}

function copyInappUrl() {
  if (!inappUrl) return;
  const url = publicArtworkUrl();
  navigator.clipboard?.writeText(url)
    .then(() => { inappUrl.textContent = "Copied."; })
    .catch(() => { inappUrl.textContent = url; });
}

function openPrintInquiry(event) {
  event.preventDefault();
  const mailbox = ["hello", "averylakeofficial.com"].join("@");
  const subject = encodeURIComponent("Signed Prints Inquiry - No Prompt for Breath");
  window.location.href = `mailto:${mailbox}?subject=${subject}`;
}

/* Reading sequence */
function startReading() {
  window.clearTimeout(readingTimer);

  /* Image not yet loaded; wait. */
  if (!sourceImage?.complete || !sourceImage?.naturalWidth) {
    actionButton.textContent = "Loading";
    actionButton.disabled    = true;
    sourceImage?.addEventListener("load", () => { buildBlueprint(); startReading(); }, { once: true });
    return;
  }

  /* Build; the synthetic fallback handles image-read failures. */
  buildBlueprint();

  setState("reading");
  readingTimer = window.setTimeout(() => setState("scanned"), readingDuration);
}

function restart() {
  window.clearTimeout(readingTimer);
  setState("image");
}

/* Init */
setState("image");

if (sourceImage?.complete && sourceImage?.naturalWidth) {
  buildBlueprint();
} else {
  sourceImage?.addEventListener("load", buildBlueprint, { once: true });
}

/* Listeners */
actionButton.addEventListener("click", () => { if (state === "image") startReading(); });

imageField?.addEventListener("click", () => { if (state === "image") startReading(); });

imageField?.addEventListener("keydown", (e) => {
  if (state !== "image") return;
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startReading(); }
});

homeButton.addEventListener("click", restart);

statementButton?.addEventListener("click", () => {
  if (artistStatement && typeof artistStatement.showModal === "function") {
    artistStatement.showModal();
  }
});

artifactLink?.addEventListener("click", (event) => {
  if (!isEmbeddedSocialBrowser()) return;
  event.preventDefault();
  showInappNotice();
});

inappClose?.addEventListener("click", hideInappNotice);
inappUrl?.addEventListener("click", copyInappUrl);
printInquiryLink?.addEventListener("click", openPrintInquiry);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hideInappNotice();
});
