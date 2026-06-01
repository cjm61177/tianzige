/**
 * Sheet Renderer — Canvas-based 田字格/米字格 practice sheet generator.
 *
 * Cell sizes are specified in real-world mm (12/15/20 mm).
 * A4 = 210 × 297 mm. Margins default to 15mm (sides/bottom), 20mm (top, for name).
 *
 * Rendering DPI:
 *   Preview: canvas logical size derived from mm → px at the canvas's native scale
 *   Export:  300 DPI → 2480 × 3508 px
 */

// ── Color schemes ──────────────────────────────────────────────────────
export const COLOR_SCHEMES = {
  'eye-green': {
    label: '护眼绿',
    border: '#555555',
    crossLine: '#9CCC65',
    diagLine: '#C5E1A5',
    charColor: '#333333',
    bg: '#FFFFFF',
  },
  black: {
    label: '纯黑',
    border: '#333333',
    crossLine: '#AAAAAA',
    diagLine: '#CCCCCC',
    charColor: '#333333',
    bg: '#FFFFFF',
  },
};

export const CELL_SIZE_OPTIONS = [12, 15, 20];

// ── Constants ──────────────────────────────────────────────────────────
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MARGIN_SIDE_MM = 15;
const MARGIN_TOP_MM = 20;
const MARGIN_BOTTOM_MM = 15;
const CELL_PADDING_RATIO = 0.12;
const BASE_URL = import.meta.env.BASE_URL || '/';

// ── Character data loading ─────────────────────────────────────────────

export async function loadCharData(char) {
  try {
    const res = await fetch(`${BASE_URL}hanzi-data/${char}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function loadCharDataMap(chars) {
  const unique = [...new Set(chars.filter(Boolean))];
  const results = await Promise.all(
    unique.map(async (c) => {
      const data = await loadCharData(c);
      return { char: c, data };
    })
  );
  const map = new Map();
  for (const { char, data } of results) {
    if (data) map.set(char, data);
  }
  return map;
}

// ── Bounding box helpers ───────────────────────────────────────────────

export function computeStrokesBBox(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const d of strokes) {
    const nums = d.match(/[\d.]+/g)?.map(Number) || [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  return { minX, minY, maxX, maxY, w: maxX - minX || 200, h: maxY - minY || 200 };
}

// ── mm → px layout ─────────────────────────────────────────────────────

/**
 * Compute grid layout from real-world mm cell size.
 * A4 = 210 × 297 mm. Side margins = 15mm, top = 20mm, bottom = 15mm.
 *
 * @param {number} canvasWidth  — canvas pixel width
 * @param {number} canvasHeight — canvas pixel height
 * @param {number} cellSizeMM   — desired cell size in mm (12/15/20)
 * @returns {{ cellSize, cols, rows, offsetX, offsetY, marginPx, topMarginPx }}
 */
export function computeMMLayout(canvasWidth, canvasHeight, cellSizeMM) {
  const pxPerMM = canvasWidth / A4_WIDTH_MM; // scale factor
  const cellSize = Math.floor(cellSizeMM * pxPerMM);
  const marginPx = Math.floor(MARGIN_SIDE_MM * pxPerMM);
  const topMarginPx = Math.floor(MARGIN_TOP_MM * pxPerMM);
  const bottomMarginPx = Math.floor(MARGIN_BOTTOM_MM * pxPerMM);

  const cols = Math.floor((canvasWidth - marginPx * 2) / cellSize);
  const rows = Math.floor((canvasHeight - topMarginPx - bottomMarginPx) / cellSize);

  // Center the grid
  const gridW = cellSize * cols;
  const gridH = cellSize * rows;
  const offsetX = marginPx + Math.floor((canvasWidth - marginPx * 2 - gridW) / 2);
  const offsetY = topMarginPx + Math.floor((canvasHeight - topMarginPx - bottomMarginPx - gridH) / 2);

  return { cellSize, cols, rows, offsetX, offsetY, marginPx, topMarginPx };
}

// ── Grid rendering ─────────────────────────────────────────────────────

function drawTianZiGe(ctx, x, y, cellSize, scheme) {
  const { border, crossLine, bg } = scheme;
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, cellSize, cellSize);

  const half = cellSize / 2;

  // Dashed cross lines — use thicker min width for visibility when downscaled
  ctx.strokeStyle = crossLine;
  ctx.lineWidth = Math.max(1.2, cellSize * 0.008);
  const dashLen = Math.max(2, cellSize * 0.03);
  const gapLen = Math.max(1.5, cellSize * 0.02);
  ctx.setLineDash([dashLen, gapLen]);

  ctx.beginPath();
  ctx.moveTo(x, y + half);
  ctx.lineTo(x + cellSize, y + half);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + half, y);
  ctx.lineTo(x + half, y + cellSize);
  ctx.stroke();

  ctx.setLineDash([]);

  // Outer border — thicker for clear visibility
  ctx.strokeStyle = border;
  ctx.lineWidth = Math.max(2, cellSize * 0.025);
  ctx.strokeRect(x, y, cellSize, cellSize);
}

function drawMiZiGe(ctx, x, y, cellSize, scheme) {
  drawTianZiGe(ctx, x, y, cellSize, scheme);

  // Diagonal dashed lines
  const dashLen = Math.max(2, cellSize * 0.03);
  const gapLen = Math.max(1.5, cellSize * 0.02);

  ctx.strokeStyle = scheme.diagLine;
  ctx.lineWidth = Math.max(0.8, cellSize * 0.004);
  ctx.setLineDash([dashLen, gapLen]);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + cellSize, y + cellSize);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + cellSize, y);
  ctx.lineTo(x, y + cellSize);
  ctx.stroke();

  ctx.setLineDash([]);
}

function drawGridCell(ctx, x, y, cellSize, gridType, scheme) {
  if (gridType === 'mi') {
    drawMiZiGe(ctx, x, y, cellSize, scheme);
  } else {
    drawTianZiGe(ctx, x, y, cellSize, scheme);
  }
}

// ── Character rendering (top-left aligned) ─────────────────────────────

export function renderCharStrokes(ctx, strokes, x, y, cellSize, opts = {}) {
  const { strokeCount = 0, scheme } = opts;
  const visible = strokeCount > 0 ? strokes.slice(0, strokeCount) : strokes;
  if (visible.length === 0) return;

  const bbox = computeStrokesBBox(strokes);
  const pad = cellSize * CELL_PADDING_RATIO;
  const available = cellSize - pad * 2;
  const scale = Math.min(available / bbox.w, available / bbox.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  ctx.clip();

  // Top-left alignment: char bbox (minX, maxY) → cell (x + pad, y + pad)
  ctx.translate(x + pad, y + pad);
  ctx.scale(scale, -scale);
  ctx.translate(-bbox.minX, -bbox.maxY);

  const color = scheme ? scheme.charColor : '#333333';
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const pathD of visible) {
    const p = new Path2D(pathD);
    ctx.fill(p);
    ctx.stroke(p);
  }

  ctx.restore();
}

function renderTextInCell(ctx, text, x, y, cellSize, color) {
  if (!text) return;
  const maxFontSize = cellSize / (text.length * 1.1);
  const fontSize = Math.min(maxFontSize, cellSize * 0.5);
  ctx.save();
  ctx.fillStyle = color || '#333333';
  ctx.font = `${fontSize}px "KaiTi", "STKaiti", "Noto Serif SC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + cellSize / 2, y + cellSize / 2);
  ctx.restore();
}

// ── Main render ────────────────────────────────────────────────────────

/**
 * Split cells into pages based on available rows per page.
 * Returns an array of page cell arrays.
 */
export function splitIntoPages(cells, rowsPerPage) {
  if (!cells || cells.length === 0) return [[]];
  const pages = [];
  for (let i = 0; i < cells.length; i += rowsPerPage) {
    pages.push(cells.slice(i, i + rowsPerPage));
  }
  return pages;
}

/**
 * Render one page of the practice sheet onto a canvas.
 * If pageCells is null/empty, renders the empty grid.
 */
export function renderA4Sheet(canvas, config, cells) {
  const ctx = canvas.getContext('2d');
  const scheme = COLOR_SCHEMES[config.colorScheme] || COLOR_SCHEMES['eye-green'];
  const { gridType, cellSizeMM } = config;

  // White background
  ctx.fillStyle = scheme.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Compute mm-based layout
  const layout = computeMMLayout(canvas.width, canvas.height, cellSizeMM || 15);
  const { cellSize, cols, rows, offsetX, offsetY } = layout;

  // If no cells provided, render the full empty grid
  if (!cells || cells.length === 0) {
    renderEmptyGrid(ctx, layout, gridType, scheme);
    return;
  }

  // Determine actual columns from data (may exceed layout cols for wordgroup)
  const dataCols = cells.reduce((max, row) => Math.max(max, row.length), cols);
  const effectiveCols = Math.max(cols, dataCols);
  let effCellSize = cellSize;
  let effOffsetX = offsetX;
  if (dataCols > cols) {
    effCellSize = Math.floor((canvas.width - layout.marginPx * 2) / dataCols);
    effOffsetX = layout.marginPx + Math.floor((canvas.width - layout.marginPx * 2 - effCellSize * dataCols) / 2);
  }
  const renderCols = Math.max(effectiveCols, dataCols);
  const renderRows = Math.min(rows, cells.length);

  for (let r = 0; r < renderRows; r++) {
    const rowCells = cells[r] || [];
    const colCount = Math.max(renderCols, rowCells.length);

    for (let c = 0; c < colCount; c++) {
      const cellX = effOffsetX + c * effCellSize;
      const cellY = offsetY + r * effCellSize;
      const cellData = rowCells[c];

      // Always draw grid for every cell in the page
      drawGridCell(ctx, cellX, cellY, effCellSize, gridType, scheme);

      if (!cellData || cellData.type === 'empty') continue;

      if (cellData.type === 'char' && cellData.strokes?.length > 0) {
        renderCharStrokes(ctx, cellData.strokes, cellX, cellY, effCellSize, {
          strokeCount: cellData.strokeCount || 0,
          scheme,
        });
      } else if (cellData.type === 'text' && cellData.text) {
        renderTextInCell(ctx, cellData.text, cellX, cellY, effCellSize, scheme.charColor);
      }
    }
  }
}

/**
 * Render the full empty grid — used for initial state before any characters are entered.
 */
export function renderEmptyGrid(ctx, layout, gridType, scheme) {
  const { cellSize, cols, rows, offsetX, offsetY } = layout;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      drawGridCell(ctx, x, y, cellSize, gridType, scheme);
    }
  }
}

// ── Cell layout builders ───────────────────────────────────────────────

/**
 * Build cells for "纯抄写" (copy) mode.
 *
 * @param {string[]} characters   — list of characters
 * @param {number} copyCount      — how many cells per character (first = template)
 * @param {Map} charDataMap
 * @param {number} cols           — columns available on the page
 * @param {string} layoutMode     — 'compact' (continuous flow) or 'beautiful' (new row per char)
 */
export function buildCopyModeCells(characters, copyCount, charDataMap, cols, layoutMode) {
  const rows = [];
  let currentRow = [];
  let colIndex = 0;

  for (const char of characters) {
    const data = charDataMap.get(char);
    if (!data) continue;

    // Build this character's cell group: [template, empty, empty, ...]
    const group = [];
    group.push({
      type: 'char', char, strokes: data.strokes, strokeCount: 0,
    });
    for (let i = 1; i < copyCount; i++) {
      group.push({ type: 'empty' });
    }

    if (layoutMode === 'beautiful') {
      // Start a new row for each character
      if (currentRow.length > 0) {
        // Pad and push the previous row
        while (currentRow.length < cols) currentRow.push({ type: 'empty' });
        rows.push(currentRow);
        currentRow = [];
        colIndex = 0;
      }
      // Put the group in its own row
      currentRow = [...group];
      while (currentRow.length < cols) currentRow.push({ type: 'empty' });
      rows.push(currentRow);
      currentRow = [];
      colIndex = 0;
    } else {
      // Compact mode: continuous flow
      for (const cell of group) {
        currentRow.push(cell);
        colIndex++;
        if (colIndex >= cols) {
          rows.push(currentRow);
          currentRow = [];
          colIndex = 0;
        }
      }
    }
  }

  // Pad last row
  if (currentRow.length > 0) {
    while (currentRow.length < cols) currentRow.push({ type: 'empty' });
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Build cells for "从笔画开始" (stroke-progressive) mode.
 *
 * Each repetition:
 *   1. Breakdown rows: one cell per stroke count (1, 2, ..., N).
 *      Wraps to next row(s) if stroke count exceeds columns.
 *   2. Practice rows: SAME number of empty rows as breakdown rows.
 *      This ensures each stroke cell has a corresponding empty cell
 *      directly below for the student to practice writing.
 *
 * Example: "啊" (10 strokes), 9 cols
 *   Row 0: s1  s2  s3  s4  s5  s6  s7  s8  s9   ← breakdown row 1
 *   Row 1: [  ] [  ] [  ] [  ] [  ] [  ] [  ] [  ] [  ]  ← practice row 1
 *   Row 2: s10 [  ] [  ] [  ] [  ] [  ] [  ] [  ] [  ]  ← breakdown row 2
 *   Row 3: [  ] [  ] [  ] [  ] [  ] [  ] [  ] [  ] [  ]  ← practice row 2
 */
export function buildStrokeProgressiveCells(characters, copyCount, charDataMap, cols) {
  const rows = [];

  for (const char of characters) {
    const data = charDataMap.get(char);
    if (!data) continue;

    const totalStrokes = data.strokes.length;

    for (let rep = 0; rep < copyCount; rep++) {
      // ── Breakdown rows ──
      const breakdownRows = [];
      let bRow = [];
      for (let s = 1; s <= totalStrokes; s++) {
        bRow.push({
          type: 'char', char, strokes: data.strokes, strokeCount: s,
        });
        if (bRow.length >= cols) {
          breakdownRows.push(bRow);
          bRow = [];
        }
      }
      if (bRow.length > 0) {
        breakdownRows.push(bRow);
      }

      // Interleave: each breakdown row immediately followed by its practice row
      for (const br of breakdownRows) {
        // Pad to full width
        while (br.length < cols) br.push({ type: 'empty' });
        rows.push(br);

        // Practice row directly below
        const emptyRow = [];
        for (let j = 0; j < cols; j++) {
          emptyRow.push({ type: 'empty' });
        }
        rows.push(emptyRow);
      }
    }
  }

  return rows;
}

/**
 * Build cells for "3+2 组词" (word group) mode.
 *
 * Each word group → one row: 3 base char cells + each char of each word in its own cell.
 */
export function buildWordGroupCells(wordGroups, charDataMap, cols) {
  const rows = [];

  for (const group of wordGroups) {
    const baseData = charDataMap.get(group.char);
    if (!baseData) continue;

    const row = [];

    // First 3 cells: base character
    for (let i = 0; i < 3; i++) {
      row.push({
        type: 'char', char: group.char, strokes: baseData.strokes, strokeCount: 0,
      });
    }

    // Each character of each word in its own cell
    for (const word of group.words) {
      for (const wc of word) {
        const wcData = charDataMap.get(wc);
        if (wcData) {
          row.push({
            type: 'char', char: wc, strokes: wcData.strokes, strokeCount: 0,
          });
        } else {
          row.push({ type: 'text', text: wc });
        }
      }
    }

    rows.push(row);
  }

  return rows;
}
