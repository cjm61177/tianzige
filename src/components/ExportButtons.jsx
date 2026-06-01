import { useState, useCallback } from 'react';
import { jsPDF } from 'jspdf';
import { renderA4Sheet, splitIntoPages, computeMMLayout } from '../utils/sheetRenderer';
import { IconDownloadPNG, IconDownloadPDF } from './Icons';

const EXPORT_WIDTH = 2480;   // A4 @ 300 DPI
const EXPORT_HEIGHT = 3508;

export default function ExportButtons({ config, cells }) {
  const [exporting, setExporting] = useState(null);

  const renderExportPages = useCallback(() => {
    // Compute rows per page at export resolution
    const layout = computeMMLayout(EXPORT_WIDTH, EXPORT_HEIGHT, config.cellSizeMM || 15);
    const pageCellSets = splitIntoPages(cells, layout.rows);

    return pageCellSets.map((pageCells) => {
      const canvas = document.createElement('canvas');
      canvas.width = EXPORT_WIDTH;
      canvas.height = EXPORT_HEIGHT;
      renderA4Sheet(canvas, config, pageCells);
      return canvas;
    });
  }, [config, cells]);

  const handleExportPNG = useCallback(async () => {
    setExporting('png');
    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvases = renderExportPages();

      if (canvases.length === 1) {
        const blob = await new Promise((r) => canvases[0].toBlob(r, 'image/png'));
        downloadBlob(blob, `tianzige-${Date.now()}.png`);
      } else {
        // Multiple pages — download each as separate file
        for (let i = 0; i < canvases.length; i++) {
          const blob = await new Promise((r) => canvases[i].toBlob(r, 'image/png'));
          downloadBlob(blob, `tianzige-${Date.now()}-p${i + 1}.png`);
        }
      }
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setExporting(null);
    }
  }, [renderExportPages]);

  const handleExportPDF = useCallback(async () => {
    setExporting('pdf');
    await new Promise((r) => setTimeout(r, 100));

    try {
      const canvases = renderExportPages();
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < canvases.length; i++) {
        if (i > 0) pdf.addPage();
        const imgData = canvases[i].toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`tianzige-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(null);
    }
  }, [renderExportPages]);

  return (
    <div className="export-buttons">
      <button
        className="btn btn-export"
        onClick={handleExportPNG}
        disabled={!!exporting}
      >
        <IconDownloadPNG size={18} />
        <span>{exporting === 'png' ? '生成中...' : '导出 PNG'}</span>
      </button>
      <button
        className="btn btn-export btn-export-pdf"
        onClick={handleExportPDF}
        disabled={!!exporting}
      >
        <IconDownloadPDF size={18} />
        <span>{exporting === 'pdf' ? '生成中...' : '导出 PDF'}</span>
      </button>
    </div>
  );
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
