/**
 * Chinese stroke classification using geometric heuristics.
 * Based on Wikipedia 笔画 definitions: https://zh.wikipedia.org/zh-cn/笔画
 *
 * Coordinate system: Make Me A Hanzi data uses math coords (Y-up).
 *   dy < 0 → DOWN  (top → bottom)
 *   dy > 0 → UP    (bottom → top)
 *
 * Key insight: The start point's RELATIVE POSITION within the stroke's
 * bounding box is the most reliable indicator of stroke type.
 *   - Start at TOP-RIGHT → 撇 (left-falling)
 *   - Start at TOP-LEFT  → 捺 (right-falling)
 *   - Start at TOP       → 竖 (vertical)
 *   - Start at LEFT      → 横 (horizontal)
 *   - Start at BOTTOM-LEFT → 提 (rising)
 */

export function classifyStroke(pathD) {
  if (!pathD) return '';
  const nums = pathD.match(/[\d.]+/g)?.map(Number) || [];
  if (nums.length < 4) return '点';

  // ── Bounding box ────────────────────────────────────────────────
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < nums.length - 1; i += 2) {
    const x = nums[i], y = nums[i + 1];
    if (!isNaN(x) && !isNaN(y)) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const w = maxX - minX;
  const h = maxY - minY;
  const sx = nums[0], sy = nums[1];

  // ── Start position within bbox (0=left/bottom, 1=right/top) ─────
  const rx = w > 0 ? (sx - minX) / w : 0.5;  // 0=left, 1=right
  const ry = h > 0 ? (sy - minY) / h : 0.5;  // 0=bottom, 1=top (math coords)

  // ── Direction from start to bbox center (supplementary) ──────────
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const dx = cx - sx, dy = cy - sy;

  // Count significant bends for compound stroke detection
  let bends = 0;
  for (let i = 2; i < nums.length - 8; i += 4) {
    const ax = nums[i + 2] - nums[i], ay = nums[i + 3] - nums[i + 1];
    const bx = nums[i + 6] - nums[i + 4], by = nums[i + 7] - nums[i + 5];
    const mA = Math.sqrt(ax * ax + ay * ay), mB = Math.sqrt(bx * bx + by * by);
    if (mA > 30 && mB > 30) {
      const cosA = (ax * bx + ay * by) / (mA * mB);
      if (cosA < 0.3) bends++;
    }
  }

  // ── Classification ───────────────────────────────────────────────

  // 1. 点 (dot): very small. Wikipedia: short, mostly top-left → bottom-right.
  if ((w < 180 && h < 180) || nums.length <= 6) return '点';

  // 2. 横 (horizontal): wide & flat. Wikipedia: left→right, 楷体 "极轻微地向上斜".
  //    Distinguished from 提 by w >> h.
  if (w > h * 2.5) {
    // 提 starts from bottom-left; 横 starts from left
    return (ry < 0.25 && rx < 0.3) ? '提' : '横';
  }

  // 3. 竖 (vertical): tall & narrow. Wikipedia: top→bottom.
  if (h > w * 2.5) {
    // Check for 竖钩: vertical stroke with sharp horizontal ending
    if (nums.length >= 12) {
      const ax = nums[nums.length - 6] - nums[nums.length - 10];
      const ay = nums[nums.length - 5] - nums[nums.length - 9];
      if (Math.abs(ax) > Math.abs(ay) * 1.5) return '竖钩';
    }
    return '竖';
  }

  // 4. Diagonal strokes — use START POSITION within bbox (most reliable)
  //    Wikipedia: 撇 starts from top-RIGHT, 捺 starts from top-LEFT.
  if (ry > 0.48) {
    // Start near TOP of bbox → stroke goes downward
    if (rx > 0.5) return '撇';   // right side → left-falling
    if (rx < 0.5) return '捺';   // left side → right-falling
  }

  // 5. Start near BOTTOM of bbox → going UP
  if (ry < 0.3) {
    if (rx < 0.45 && dx > 30) return '提';  // bottom-left → rising
    if (dx < -30 && dy < -30) return '撇';
    return '提';
  }

  // 6. Middle-vertical start — use bounding box aspect ratio + direction
  if (bends >= 2) return '折';
  if (w > h * 1.5) return dy > 0 ? '提' : '横';
  if (h > w * 1.5) return '竖';

  // 7. Use dx/dy for remaining cases
  if (Math.abs(dx) > 30 && Math.abs(dy) > 30) {
    if (dy < 0) return dx > 0 ? '捺' : '撇';
    if (dy > 0) return dx > 0 ? '提' : '撇';
  }

  if (bends >= 1 || nums.length > 14) return '折';
  return '折';
}

export function getStrokeLabel(index, pathD) {
  const name = classifyStroke(pathD);
  return name ? `第${index}画 · ${name}` : `第${index}画`;
}

export const STROKE_REFERENCE = [
  { name: '横', desc: '从左到右的水平笔画' },
  { name: '竖', desc: '从上到下的垂直笔画' },
  { name: '撇', desc: '从右上到左下的斜笔' },
  { name: '捺', desc: '从左上到右下的斜笔' },
  { name: '点', desc: '短小的点状笔画' },
  { name: '提', desc: '从左下到右上的挑笔' },
  { name: '折', desc: '带转折的复合笔画' },
  { name: '钩', desc: '末端带钩的笔画' },
];
