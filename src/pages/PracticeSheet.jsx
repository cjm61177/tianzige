import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import SheetConfig from '../components/SheetConfig';
import SheetPreview from '../components/SheetPreview';
import ExportButtons from '../components/ExportButtons';
import {
  loadCharDataMap,
  buildCopyModeCells,
  buildStrokeProgressiveCells,
  buildWordGroupCells,
  computeMMLayout,
} from '../utils/sheetRenderer';

const PREVIEW_WIDTH = 1190;
const PREVIEW_HEIGHT = 1684;

const DEFAULT_CONFIG = {
  mode: 'copy',
  charInput: '',
  characters: [],
  wordGroups: [],
  gridType: 'tian',
  colorScheme: 'eye-green',
  cellSizeMM: 15,
  copyCount: 3,
  layoutMode: 'compact',
};

export default function PracticeSheet() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [status, setStatus] = useState('empty');
  const [charDataMap, setCharDataMap] = useState(new Map());
  const [errorChars, setErrorChars] = useState([]);
  const charInputRef = useRef(null);

  // Compute cols from mm layout (stable, used by cell builders)
  const layoutCols = useMemo(() => {
    const layout = computeMMLayout(PREVIEW_WIDTH, PREVIEW_HEIGHT, config.cellSizeMM || 15);
    return layout.cols;
  }, [config.cellSizeMM]);

  // Collect all characters that need data
  const neededChars = useMemo(() => {
    const chars = new Set();
    if (config.mode === 'wordgroup') {
      for (const g of config.wordGroups || []) {
        chars.add(g.char);
        for (const w of g.words) {
          for (const wc of w) chars.add(wc);
        }
      }
    } else {
      for (const c of config.characters || []) chars.add(c);
    }
    return [...chars];
  }, [config.mode, config.characters, config.wordGroups]);

  // Load character data
  useEffect(() => {
    if (neededChars.length === 0) {
      setCharDataMap(new Map());
      setStatus('empty');
      return;
    }

    let cancelled = false;
    setStatus('loading');

    loadCharDataMap(neededChars).then((map) => {
      if (cancelled) return;
      const missing = neededChars.filter((c) => !map.has(c));
      setErrorChars(missing);
      setCharDataMap(map);
      setStatus(map.size === 0 ? 'error' : 'ready');
    });

    return () => { cancelled = true; };
  }, [neededChars]);

  // Build cell grid
  const cells = useMemo(() => {
    if (status !== 'ready' && status !== 'loading') return [];

    try {
      switch (config.mode) {
        case 'copy':
          return buildCopyModeCells(
            config.characters, config.copyCount, charDataMap,
            layoutCols, config.layoutMode || 'compact'
          );
        case 'stroke':
          return buildStrokeProgressiveCells(
            config.characters, config.copyCount, charDataMap, layoutCols
          );
        case 'wordgroup':
          return buildWordGroupCells(
            config.wordGroups || [], charDataMap, layoutCols
          );
        default:
          return [];
      }
    } catch (err) {
      console.error('Failed to build cells:', err);
      return [];
    }
  }, [config, charDataMap, status, layoutCols]);

  const handleAddWordGroup = useCallback((group) => {
    setConfig((prev) => ({
      ...prev,
      wordGroups: [...(prev.wordGroups || []), group],
    }));
  }, []);

  const handleCharInputChange = useCallback((e) => {
    const val = e.target.value;
    const chars = val.match(/[一-鿿]/g) || [];
    setConfig((prev) => ({ ...prev, charInput: val, characters: chars }));
  }, []);

  const hasContent = useMemo(() => {
    if (config.mode === 'wordgroup') return (config.wordGroups || []).length > 0;
    return (config.characters || []).length > 0;
  }, [config.mode, config.characters, config.wordGroups]);

  const displayStatus = hasContent ? status : 'empty';

  return (
    <div className="page practice-sheet-page">
      <header className="app-header">
        <h1>练习纸生成器</h1>
        <p className="subtitle">标准田字格/米字格 · A4打印</p>
      </header>

      {/* Character input — always visible */}
      {config.mode !== 'wordgroup' && (
        <div className="char-input-area">
          <label className="config-label" htmlFor="char-input-main">
            易错字（用空格或逗号分隔）
          </label>
          <input
            id="char-input-main"
            ref={charInputRef}
            type="text"
            className="config-input config-input-char"
            placeholder="如：花 草 树 木"
            value={config.charInput || ''}
            onChange={handleCharInputChange}
            autoFocus
          />
          {config.characters && config.characters.length > 0 && (
            <p className="input-hint">
              已识别 {config.characters.length} 个汉字：{config.characters.join('、')}
            </p>
          )}
        </div>
      )}

      {/* Error banner */}
      {errorChars.length > 0 && (
        <div className="error-banner">
          以下汉字缺少笔画数据：{errorChars.join('、')}
        </div>
      )}

      {/* Preview — always shows grid, even when empty; image-based with zoom */}
      <SheetPreview config={config} cells={cells} />

      {/* Export buttons */}
      {displayStatus === 'ready' && cells.length > 0 && (
        <ExportButtons config={config} cells={cells} />
      )}

      {/* Config panel */}
      <SheetConfig
        config={config}
        onChange={setConfig}
        onAddWordGroup={handleAddWordGroup}
        autoExpand={!hasContent}
      />

      <div className="config-spacer" />
    </div>
  );
}
