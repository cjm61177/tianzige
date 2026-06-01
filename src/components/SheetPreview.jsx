import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  renderA4Sheet, computeMMLayout, renderEmptyGrid, COLOR_SCHEMES, splitIntoPages,
} from '../utils/sheetRenderer';

// Preview at 96 DPI — gives clear lines at typical screen resolutions
// A4 = 210×297mm → 794×1123 px
const PREVIEW_WIDTH = 794;
const PREVIEW_HEIGHT = 1123;

export default function SheetPreview({ config, cells }) {
  const [pages, setPages] = useState([]);       // Array of { url, width, height }
  const [currentPage, setCurrentPage] = useState(0);
  const containerRef = useRef(null);

  const layout = useMemo(() => {
    return computeMMLayout(PREVIEW_WIDTH, PREVIEW_HEIGHT, config.cellSizeMM || 15);
  }, [config.cellSizeMM]);

  const rowsPerPage = layout.rows;

  // Split cells into pages and render each page to an image
  useEffect(() => {
    // Clean up old blob URLs
    pages.forEach((p) => {
      if (p.url && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
    });

    const cellPages = splitIntoPages(cells, rowsPerPage);

    const newPages = cellPages.map((pageCells) => {
      const canvas = document.createElement('canvas');
      canvas.width = PREVIEW_WIDTH;
      canvas.height = PREVIEW_HEIGHT;
      renderA4Sheet(canvas, config, pageCells);
      const url = canvas.toDataURL('image/png');
      return { url, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT };
    });

    setPages(newPages);
    setCurrentPage(0);

    return () => {
      newPages.forEach((p) => {
        if (p.url && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
      });
    };
  }, [config, cells, rowsPerPage]);

  const goToPage = useCallback((p) => {
    if (p >= 0 && p < pages.length) setCurrentPage(p);
  }, [pages.length]);

  const currentImage = pages[currentPage];

  return (
    <div className="sheet-preview-container">
      {/* Image preview — scrollable for zoom */}
      <div className="sheet-preview" ref={containerRef}>
        {currentImage && (
          <img
            src={currentImage.url}
            alt={`练习纸预览 第${currentPage + 1}页`}
            className="sheet-img"
            width={currentImage.width}
            height={currentImage.height}
          />
        )}
      </div>

      {/* Page navigation */}
      {pages.length > 1 && (
        <div className="page-nav">
          <button
            className="btn btn-sm btn-outline"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            上一页
          </button>
          <span className="page-indicator">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= pages.length - 1}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
