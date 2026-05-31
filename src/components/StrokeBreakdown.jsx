import { memo, useMemo } from 'react';

/**
 * Parse stroke path strings to find bounding box.
 * Make Me A Hanzi data uses Y-up (math) coordinates.
 */
function getStrokesBBox(strokes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  strokes.forEach(d => {
    const nums = d.match(/[\d.]+/g)?.map(Number) || [];
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = nums[i];
      const y = nums[i + 1];
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  });
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

/**
 * Compute viewBox and Y-flip transform to center the character in a square grid.
 *
 * Make Me A Hanzi data uses Y-up (math coords), SVG uses Y-down.
 * The Y-flip transform maps math_Y → SVG_Y:
 *   SVG_Y = (mathMinY + mathMaxY) - math_Y
 *
 * We compute a square viewBox centered on the character with ~20% padding,
 * so the character is properly centered and not clipped.
 */
function useGridLayout(strokes) {
  return useMemo(() => {
    const bbox = getStrokesBBox(strokes);
    const charW = bbox.w || 200;
    const charH = bbox.h || 200;
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    const size = Math.max(charW, charH) * 1.3; // 30% total padding (15% each side)
    const half = size / 2;

    const vbX = cx - half;
    const vbY = cy - half;
    const vbW = size;
    const vbH = size;

    // Y-flip: maps math Y to SVG Y. At math_minY → near bottom, at math_maxY → near top.
    const yFlipTy = bbox.minY + bbox.maxY;

    // Stroke width scaled to viewBox size
    const strokeW = size * 0.035;

    // Grid line width
    const gridLineW = size * 0.004;
    const borderW = size * 0.008;

    return {
      viewBox: `${vbX} ${vbY} ${vbW} ${vbH}`,
      yFlipTransform: `matrix(1, 0, 0, -1, 0, ${yFlipTy})`,
      strokeWidth: strokeW,
      gridLineWidth: gridLineW,
      borderWidth: borderW,
      // Grid elements in viewBox coordinates
      gridCenterX: cx,
      gridCenterY: cy,
      gridMargin: size * 0.02,
    };
  }, [strokes]);
}

const MiniGrid = memo(function MiniGrid({ strokes, strokeIndex, isActive, onClick, layout }) {
  const visibleStrokes = strokes.slice(0, strokeIndex);
  const {
    viewBox, yFlipTransform, strokeWidth,
    gridLineWidth, borderWidth,
    gridCenterX, gridCenterY, gridMargin,
  } = layout;

  // Parse viewBox for background/grid elements
  const vbParts = viewBox.split(' ').map(Number);
  const vbX = vbParts[0];
  const vbY = vbParts[1];
  const vbW = vbParts[2];
  const vbH = vbParts[3];

  return (
    <div
      className={`breakdown-cell${isActive ? ' active' : ''}`}
      onClick={onClick}
      title={`第 ${strokeIndex} 画`}
    >
      <svg
        className="mini-tianzige"
        viewBox={viewBox}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="#fff" rx={vbW * 0.02} />

        {/* 田字格 cross lines (dashed) */}
        <line
          x1={vbX + gridMargin} y1={gridCenterY}
          x2={vbX + vbW - gridMargin} y2={gridCenterY}
          stroke="#e0d5c1" strokeWidth={gridLineWidth}
          strokeDasharray={`${vbW * 0.02} ${vbW * 0.015}`}
        />
        <line
          x1={gridCenterX} y1={vbY + gridMargin}
          x2={gridCenterX} y2={vbY + vbH - gridMargin}
          stroke="#e0d5c1" strokeWidth={gridLineWidth}
          strokeDasharray={`${vbW * 0.02} ${vbW * 0.015}`}
        />

        {/* Outer border */}
        <rect
          x={vbX + gridMargin} y={vbY + gridMargin}
          width={vbW - gridMargin * 2} height={vbH - gridMargin * 2}
          fill="none" stroke="#3d3027" strokeWidth={borderWidth}
          rx={vbW * 0.015}
        />

        {/* Stroke paths — Y-flipped from math coords */}
        <g
          fill="none"
          stroke="#333333"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={yFlipTransform}
        >
          {visibleStrokes.map((pathD, i) => (
            <path key={i} d={pathD} />
          ))}
        </g>
      </svg>
      <span className="cell-label">第{strokeIndex}画</span>
    </div>
  );
});

export default function StrokeBreakdown({ character, totalStrokes, charData, activeStroke, onStrokeClick }) {
  if (!character || totalStrokes === 0 || !charData) return null;

  const strokes = charData.strokes;
  if (!strokes || strokes.length === 0) return null;

  // Compute shared layout from stroke data (memoized)
  const layout = useGridLayout(strokes);

  const maxStrokes = Math.min(totalStrokes, 30);
  const grids = [];
  for (let i = 1; i <= maxStrokes; i++) {
    grids.push(
      <MiniGrid
        key={`${character}-${i}`}
        strokes={strokes}
        strokeIndex={i}
        isActive={activeStroke === i}
        onClick={() => onStrokeClick?.(i)}
        layout={layout}
      />
    );
  }

  return (
    <div className="breakdown-section">
      <h2>笔画分解</h2>
      <div className="breakdown-grid">{grids}</div>
    </div>
  );
}
