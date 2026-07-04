import QRCode from "qrcode";

const ARTWORK_WIDTH = 1080;
const ARTWORK_HEIGHT = 1350;
const PRIMARY = "#082442";
const QR_DARK = "#122A4C";
const NAVY_TOP = "#021A30";
const NAVY_BOTTOM = "#05223A";
const ORANGE = "#FF8A00";
const GREEN = "#35A936";
const BLUE = "#0072CE";
const ENTREGAI_ICON_SRC = "/icons/icon-128x128.png";

type MesaQrArtworkMesa = {
  id?: string;
  numero?: string | number | null;
  nome?: string | null;
  loja_id?: string | null;
  loja_nome?: string | null;
  logo_url?: string | null;
};

type MesaQrArtworkLoja = {
  id?: string;
  nome?: string | null;
  logo_url?: string | null;
};

type RenderMesaQrArtworkOptions = {
  mesa: MesaQrArtworkMesa;
  loja?: MesaQrArtworkLoja | null;
  qrValue: string;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const getMesaLabel = (mesa: MesaQrArtworkMesa) => {
  const customName = String(mesa.nome || "").trim();
  if (customName) return customName;

  const number = String(mesa.numero ?? "").trim();
  return number ? `Mesa ${number}` : "Mesa";
};

const getStoreName = (
  mesa: MesaQrArtworkMesa,
  loja?: MesaQrArtworkLoja | null,
) => String(loja?.nome || mesa.loja_nome || "Entregaí").trim();

const getStoreLogoUrl = (
  mesa: MesaQrArtworkMesa,
  loja?: MesaQrArtworkLoja | null,
) => String(loja?.logo_url || mesa.logo_url || "").trim();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    image.src = src;
  });

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawImageContain = (
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: Rect,
) => {
  const width = "naturalWidth" in image ? image.naturalWidth : Number(image.width);
  const height =
    "naturalHeight" in image ? image.naturalHeight : Number(image.height);
  if (!width || !height) return;

  const scale = Math.min(rect.width / width, rect.height / height);
  const renderWidth = width * scale;
  const renderHeight = height * scale;
  const x = rect.x + (rect.width - renderWidth) / 2;
  const y = rect.y + (rect.height - renderHeight) / 2;
  ctx.drawImage(image, x, y, renderWidth, renderHeight);
};

const setFont = (
  ctx: CanvasRenderingContext2D,
  size: number,
  weight = 700,
) => {
  ctx.font = `${weight} ${size}px Inter, Arial, sans-serif`;
};

const drawFitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    maxWidth: number;
    maxSize: number;
    minSize: number;
    weight?: number;
    color: string;
    align?: CanvasTextAlign;
  },
) => {
  let size = options.maxSize;
  const weight = options.weight ?? 700;
  setFont(ctx, size, weight);
  while (size > options.minSize && ctx.measureText(text).width > options.maxWidth) {
    size -= 2;
    setFont(ctx, size, weight);
  }
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align || "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
};

const drawDecorativeDots = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  columns: number,
  rows: number,
  color: string,
  alpha = 0.45,
) => {
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      ctx.beginPath();
      ctx.arc(x + column * 22, y + row * 22, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
};

const drawHeader = async (
  ctx: CanvasRenderingContext2D,
  mesa: MesaQrArtworkMesa,
  loja?: MesaQrArtworkLoja | null,
) => {
  const gradient = ctx.createLinearGradient(0, 0, ARTWORK_WIDTH, 390);
  gradient.addColorStop(0, NAVY_TOP);
  gradient.addColorStop(0.55, "#031C32");
  gradient.addColorStop(1, NAVY_BOTTOM);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(ARTWORK_WIDTH, 0);
  ctx.lineTo(ARTWORK_WIDTH, 318);
  ctx.lineTo(1010, 386);
  ctx.lineTo(78, 386);
  ctx.lineTo(0, 318);
  ctx.closePath();
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(34, 188);
  ctx.lineTo(34, 78);
  ctx.quadraticCurveTo(34, 28, 84, 28);
  ctx.lineTo(136, 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1046, 238);
  ctx.lineTo(1046, 76);
  ctx.quadraticCurveTo(1046, 28, 996, 28);
  ctx.lineTo(946, 28);
  ctx.stroke();
  ctx.restore();

  drawDecorativeDots(ctx, 34, 34, 9, 6, "#FFFFFF", 0.35);
  drawDecorativeDots(ctx, 1000, 256, 3, 4, "#FFFFFF", 0.5);

  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 6;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.moveTo(34, 236 + i * 18);
    ctx.lineTo(72, 274 + i * 18);
    ctx.stroke();
  }
  ctx.restore();

  const logoUrl = getStoreLogoUrl(mesa, loja);
  if (logoUrl) {
    try {
      const logo = await loadImage(logoUrl);
      drawImageContain(ctx, logo, { x: 140, y: 46, width: 800, height: 235 });
    } catch {
      drawStoreNameFallback(ctx, getStoreName(mesa, loja));
    }
  } else {
    drawStoreNameFallback(ctx, getStoreName(mesa, loja));
  }

  drawFitText(ctx, getMesaLabel(mesa), ARTWORK_WIDTH / 2, 333, {
    maxWidth: 720,
    maxSize: 34,
    minSize: 24,
    weight: 500,
    color: "#FFFFFF",
  });
};

const drawStoreNameFallback = (
  ctx: CanvasRenderingContext2D,
  storeName: string,
) => {
  drawFitText(ctx, storeName.toUpperCase(), ARTWORK_WIDTH / 2, 170, {
    maxWidth: 790,
    maxSize: 60,
    minSize: 32,
    weight: 900,
    color: "#FFFFFF",
  });
};

const drawTitleSection = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = "#FAFAFA";
  ctx.fillRect(0, 365, ARTWORK_WIDTH, 850);

  ctx.save();
  ctx.shadowColor = "rgba(8, 36, 66, 0.12)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 8;
  drawFitText(ctx, "PEÇA PELO CELULAR", ARTWORK_WIDTH / 2, 472, {
    maxWidth: 930,
    maxSize: 76,
    minSize: 52,
    weight: 900,
    color: PRIMARY,
  });
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  [
    [84, 460, 58, 446],
    [96, 435, 88, 408],
    [112, 466, 82, 472],
    [996, 460, 1022, 446],
    [984, 435, 992, 408],
    [968, 466, 998, 472],
  ].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });
  ctx.restore();

  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(72, 542);
  ctx.lineTo(172, 542);
  ctx.moveTo(908, 542);
  ctx.lineTo(1008, 542);
  ctx.stroke();

  drawFitText(
    ctx,
    "Escaneie o QR Code e acesse o cardápio",
    ARTWORK_WIDTH / 2,
    546,
    {
      maxWidth: 675,
      maxSize: 34,
      minSize: 26,
      weight: 500,
      color: PRIMARY,
    },
  );
};

const drawQrSection = async (
  ctx: CanvasRenderingContext2D,
  qrValue: string,
) => {
  const card = { x: 124, y: 586, width: 832, height: 708 };
  const qrSize = 660;
  const qrX = ARTWORK_WIDTH / 2 - qrSize / 2;
  const qrY = 620;

  ctx.save();
  ctx.shadowColor = "rgba(8, 36, 66, 0.14)";
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, card.x, card.y, card.width, card.height, 28);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, card.x, card.y, card.width, card.height, 28);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 2;
  ctx.stroke();

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, qrValue, {
    width: qrSize,
    margin: 0,
    errorCorrectionLevel: "H",
    color: { dark: QR_DARK, light: "#FFFFFF" },
  });

  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  try {
    const icon = await loadImage(ENTREGAI_ICON_SRC);
    const logoSize = 126;
    const logoX = qrX + qrSize / 2 - logoSize / 2;
    const logoY = qrY + qrSize / 2 - logoSize / 2;
    ctx.save();
    roundRect(ctx, logoX - 10, logoY - 10, logoSize + 20, logoSize + 20, 34);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();
    drawImageContain(ctx, icon, {
      x: logoX,
      y: logoY,
      width: logoSize,
      height: logoSize,
    });
  } catch {
    const badgeSize = 136;
    const badgeX = qrX + qrSize / 2 - badgeSize / 2;
    const badgeY = qrY + qrSize / 2 - badgeSize / 2;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 34);
    ctx.fill();
    drawFitText(ctx, "Entregaí", qrX + qrSize / 2, qrY + qrSize / 2, {
      maxWidth: 112,
      maxSize: 24,
      minSize: 18,
      weight: 800,
      color: PRIMARY,
    });
  }
};

const drawSideDecorations = (ctx: CanvasRenderingContext2D) => {
  ctx.save();
  ctx.lineWidth = 7;
  ctx.lineCap = "square";
  ctx.strokeStyle = GREEN;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-8, 822 + i * 20);
    ctx.lineTo(42, 872 + i * 20);
    ctx.stroke();
  }

  ctx.strokeStyle = BLUE;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.moveTo(1056, 730 + i * 20);
    ctx.lineTo(1106, 780 + i * 20);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = NAVY_TOP;
  roundRect(ctx, -34, 1030, 96, 174, 22);
  ctx.fill();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 3;
  roundRect(ctx, 1032, 940, 92, 230, 28);
  ctx.stroke();
  ctx.restore();
};

const drawFooter = async (ctx: CanvasRenderingContext2D) => {
  const y = 1212;
  const gradient = ctx.createLinearGradient(0, y, ARTWORK_WIDTH, ARTWORK_HEIGHT);
  gradient.addColorStop(0, NAVY_TOP);
  gradient.addColorStop(1, NAVY_BOTTOM);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, y, ARTWORK_WIDTH, ARTWORK_HEIGHT - y);

  ctx.fillStyle = GREEN;
  ctx.fillRect(0, y, ARTWORK_WIDTH, 10);

  drawDecorativeDots(ctx, 22, 1270, 4, 4, "#FFFFFF", 0.5);
  drawDecorativeDots(ctx, 994, 1270, 4, 4, "#FFFFFF", 0.5);

  ctx.strokeStyle = BLUE;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(250, 1280);
  ctx.lineTo(420, 1280);
  ctx.moveTo(655, 1280);
  ctx.lineTo(830, 1280);
  ctx.stroke();
  ctx.globalAlpha = 1;

  drawFitText(ctx, "Feito pelo", ARTWORK_WIDTH / 2, 1280, {
    maxWidth: 210,
    maxSize: 32,
    minSize: 24,
    weight: 500,
    color: "#FFFFFF",
  });

  try {
    const icon = await loadImage(ENTREGAI_ICON_SRC);
    drawImageContain(ctx, icon, { x: 322, y: 1290, width: 74, height: 52 });
  } catch {
    // The written brand below remains as a fallback if the icon asset fails.
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  setFont(ctx, 38, 900);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("Entregaí", 392, 1316);

  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(540, 1295);
  ctx.lineTo(540, 1340);
  ctx.stroke();

  setFont(ctx, 32, 500);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("entregaiapp.com.br", 578, 1317);
};

export async function renderMesaQrArtwork({
  mesa,
  loja,
  qrValue,
}: RenderMesaQrArtworkOptions): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  const canvas = document.createElement("canvas");
  canvas.width = ARTWORK_WIDTH;
  canvas.height = ARTWORK_HEIGHT;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível criar o Canvas do QR Code.");

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, ARTWORK_WIDTH, ARTWORK_HEIGHT);

  await drawHeader(ctx, mesa, loja);
  drawTitleSection(ctx);
  drawSideDecorations(ctx);
  await drawFooter(ctx);
  await drawQrSection(ctx, qrValue);

  return canvas;
}

export async function generateMesaQrImage(
  options: RenderMesaQrArtworkOptions,
): Promise<string> {
  const canvas = await renderMesaQrArtwork(options);
  return canvas.toDataURL("image/png", 1);
}

export function mesaQrArtworkFileName(
  mesa: MesaQrArtworkMesa,
  loja?: MesaQrArtworkLoja | null,
) {
  const storeSlug = getStoreName(mesa, loja)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const mesaSlug = getMesaLabel(mesa)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `qr-${mesaSlug || "mesa"}${storeSlug ? `-${storeSlug}` : ""}.png`;
}

export function writeMesaQrPrintDocument(
  printWindow: Window,
  imageDataUrl: string,
  mesa: MesaQrArtworkMesa,
) {
  const title = `QR Code - ${getMesaLabel(mesa)}`;
  const escapedTitle = escapeHtml(title);
  printWindow.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>${escapedTitle}</title>
    <style>
      @page { margin: 0; }
      * {
        box-sizing: border-box;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      html, body {
        margin: 0;
        min-height: 100%;
        background: #ffffff;
      }
      body {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        font-family: Arial, sans-serif;
      }
      img {
        display: block;
        width: 100%;
        max-width: ${ARTWORK_WIDTH}px;
        height: auto;
      }
      @media print {
        html, body { width: 100%; }
        img {
          width: 100vw;
          max-width: none;
          height: auto;
        }
      }
    </style>
  </head>
  <body>
    <img src="${imageDataUrl}" alt="${escapedTitle}">
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      };
    </script>
  </body>
</html>`);
  printWindow.document.close();
}
