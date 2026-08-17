export type ExportCard = {
  position: number;
  image: string;
  name: string;
  positionLabel: string;
};

export type ExportReadingData = {
  siteTitle: string;
  spreadName: string;
  dateLabel: string;
  question?: string;
  noQuestionLabel: string;
  notesLabel: string;
  notes?: string;
  cards: ExportCard[];
};

const GOLD = "#8f5e2b";
const GOLD_BORDER = "#c18a45";
const INK = "#20180d";
const INK_BODY = "#3a2c19";
const MUTED = "#5a4526";
const SUBTLE = "#8a7554";
const PARCHMENT = "#fffaee";

const DISPLAY_FONT = `"Cinzel", "Cormorant Garamond", Georgia, serif`;
const SERIF_FONT = `"Cormorant Garamond", "EB Garamond", Georgia, serif`;
const SMALLCAPS_FONT = `"Cormorant SC", "Cormorant Garamond", Georgia, serif`;
const MONO_FONT = `"JetBrains Mono", ui-monospace, monospace`;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Google Fonts are loaded cross-origin; if that fetch stalls (offline, blocked
// network) don't let it hang the export forever — fall back to the generic
// serif/mono stacks after a short wait.
function fontsReadyOrTimeout(ms = 1500): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, ms))]);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length > 0 ? lines : [""];
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const WIDTH = 900;
const PADDING = 48;
const CARD_W = 130;
const CARD_H = 204;
const CARD_GAP = 20;
const LABEL_BLOCK_H = 40;

export async function exportReadingAsJpeg(data: ExportReadingData): Promise<string> {
  const [images] = await Promise.all([
    Promise.all(data.cards.map((c) => loadImage(c.image))),
    fontsReadyOrTimeout(),
  ]);

  const contentWidth = WIDTH - PADDING * 2;
  const columns = data.cards.length <= 5 ? data.cards.length : 3;
  const rows = Math.ceil(data.cards.length / columns);
  const gridWidth = columns * CARD_W + (columns - 1) * CARD_GAP;
  const gridStartX = PADDING + (contentWidth - gridWidth) / 2;
  const gridHeight = rows * (CARD_H + LABEL_BLOCK_H) + (rows - 1) * CARD_GAP;

  const measureCanvas = document.createElement("canvas");
  const mctx = measureCanvas.getContext("2d")!;

  mctx.font = `italic 18px ${SERIF_FONT}`;
  const questionText = data.question ? `“${data.question}”` : data.noQuestionLabel;
  const questionLines = wrapText(mctx, questionText, contentWidth);

  const notesLines: string[] = [];
  if (data.notes) {
    mctx.font = `15px ${SERIF_FONT}`;
    data.notes.split("\n").forEach((paragraph) => {
      notesLines.push(...wrapText(mctx, paragraph, contentWidth));
    });
  }

  const headerHeight = 48;
  const metaHeight = 34;
  const questionHeight = questionLines.length * 24 + 24;
  const notesHeight = data.notes ? 20 + notesLines.length * 20 + 24 : 0;
  const height = PADDING + headerHeight + metaHeight + questionHeight + gridHeight + notesHeight + PADDING;

  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  ctx.fillStyle = PARCHMENT;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "alphabetic";

  let y = PADDING;

  ctx.textAlign = "center";
  ctx.fillStyle = GOLD;
  ctx.font = `13px ${DISPLAY_FONT}`;
  ctx.fillText(data.siteTitle.toUpperCase(), WIDTH / 2, y);
  y += 22;

  const gradient = ctx.createLinearGradient(PADDING, 0, WIDTH - PADDING, 0);
  gradient.addColorStop(0, "rgba(193,138,69,0)");
  gradient.addColorStop(0.5, GOLD_BORDER);
  gradient.addColorStop(1, "rgba(193,138,69,0)");
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();
  y += 26;

  ctx.fillStyle = GOLD;
  ctx.font = `13px ${MONO_FONT}`;
  ctx.fillText(`${data.spreadName} · ${data.dateLabel}`, WIDTH / 2, y);
  y += 34;

  ctx.fillStyle = MUTED;
  ctx.font = `italic 18px ${SERIF_FONT}`;
  questionLines.forEach((line) => {
    ctx.fillText(line, WIDTH / 2, y);
    y += 24;
  });
  y += 14;

  images.forEach((img, i) => {
    const c = data.cards[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = gridStartX + col * (CARD_W + CARD_GAP);
    const cardY = y + row * (CARD_H + LABEL_BLOCK_H + CARD_GAP);

    ctx.save();
    roundedRectPath(ctx, x, cardY, CARD_W, CARD_H, 8);
    ctx.clip();
    const imgRatio = img.width / img.height;
    const boxRatio = CARD_W / CARD_H;
    let dw = CARD_W;
    let dh = CARD_H;
    let dx = x;
    let dy = cardY;
    if (imgRatio > boxRatio) {
      dh = CARD_H;
      dw = CARD_H * imgRatio;
      dx = x - (dw - CARD_W) / 2;
    } else {
      dw = CARD_W;
      dh = CARD_W / imgRatio;
      dy = cardY - (dh - CARD_H) / 2;
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();

    ctx.strokeStyle = GOLD_BORDER;
    ctx.lineWidth = 1;
    roundedRectPath(ctx, x, cardY, CARD_W, CARD_H, 8);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = SUBTLE;
    ctx.font = `10px ${SMALLCAPS_FONT}`;
    ctx.fillText(c.positionLabel.toUpperCase(), x + CARD_W / 2, cardY + CARD_H + 16);

    ctx.fillStyle = INK;
    ctx.font = `14px ${SERIF_FONT}`;
    ctx.fillText(c.name, x + CARD_W / 2, cardY + CARD_H + 34);
  });

  y += gridHeight;

  if (data.notes) {
    y += 24;
    ctx.strokeStyle = "rgba(193,138,69,0.35)";
    ctx.beginPath();
    ctx.moveTo(PADDING, y - 12);
    ctx.lineTo(WIDTH - PADDING, y - 12);
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = MUTED;
    ctx.font = `11px ${SMALLCAPS_FONT}`;
    ctx.fillText(data.notesLabel.toUpperCase(), PADDING, y);
    y += 20;

    ctx.fillStyle = INK_BODY;
    ctx.font = `15px ${SERIF_FONT}`;
    notesLines.forEach((line) => {
      ctx.fillText(line, PADDING, y);
      y += 20;
    });
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }
        resolve(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.92,
    );
  });
}
