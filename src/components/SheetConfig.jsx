import { useState, useCallback } from 'react';
import { IconChevronDown, IconChevronUp, IconClose } from './Icons';
import { CELL_SIZE_OPTIONS } from '../utils/sheetRenderer';

const MODES = [
  { value: 'copy', label: '纯抄写' },
  { value: 'stroke', label: '从笔画开始' },
  { value: 'wordgroup', label: '3+2 组词' },
];

const GRID_TYPES = [
  { value: 'tian', label: '田字格' },
  { value: 'mi', label: '米字格' },
];

const COLOR_SCHEMES_OPTIONS = [
  { value: 'eye-green', label: '护眼绿' },
  { value: 'black', label: '纯黑' },
];

const COPY_OPTIONS = [2, 3, 4, 5, 6, 8, 10];

const LAYOUT_MODES = [
  { value: 'compact', label: '节省' },
  { value: 'beautiful', label: '美观' },
];

export default function SheetConfig({ config, onChange, onAddWordGroup, autoExpand }) {
  const [collapsed, setCollapsed] = useState(!autoExpand);
  const [wordInput, setWordInput] = useState('');
  const [wordBaseChar, setWordBaseChar] = useState('');
  const [wordPairs, setWordPairs] = useState([]);

  const update = useCallback(
    (key, value) => onChange((prev) => ({ ...prev, [key]: value })),
    [onChange]
  );

  const handleAddWordGroup = useCallback(() => {
    if (!wordBaseChar.trim() || wordPairs.length === 0) return;
    onAddWordGroup?.({
      char: wordBaseChar.trim(),
      words: wordPairs.filter(Boolean),
    });
    setWordBaseChar('');
    setWordPairs([]);
  }, [wordBaseChar, wordPairs, onAddWordGroup]);

  const handleAddWordPair = useCallback(() => {
    const w = wordInput.trim();
    if (!w) return;
    setWordPairs((prev) => [...prev, w]);
    setWordInput('');
  }, [wordInput]);

  return (
    <div className={`sheet-config${collapsed ? ' collapsed' : ''}`}>
      <button
        className="config-toggle"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="config-toggle-text">
          格子设置
          {collapsed ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
        </span>
      </button>

      <div className="config-body">
        {/* Mode selection */}
        <div className="config-group">
          <label className="config-label">模式</label>
          <div className="config-options">
            {MODES.map((m) => (
              <button
                key={m.value}
                className={`config-option${config.mode === m.value ? ' selected' : ''}`}
                onClick={() => update('mode', m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid type */}
        <div className="config-group">
          <label className="config-label">格子类型</label>
          <div className="config-options">
            {GRID_TYPES.map((g) => (
              <button
                key={g.value}
                className={`config-option${config.gridType === g.value ? ' selected' : ''}`}
                onClick={() => update('gridType', g.value)}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color scheme */}
        <div className="config-group">
          <label className="config-label">颜色方案</label>
          <div className="config-options">
            {COLOR_SCHEMES_OPTIONS.map((cs) => (
              <button
                key={cs.value}
                className={`config-option${config.colorScheme === cs.value ? ' selected' : ''}`}
                onClick={() => update('colorScheme', cs.value)}
              >
                {cs.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cell size (mm) — replaces rows/cols */}
        <div className="config-group">
          <label className="config-label">格子大小</label>
          <div className="config-options">
            {CELL_SIZE_OPTIONS.map((mm) => (
              <button
                key={mm}
                className={`config-option${config.cellSizeMM === mm ? ' selected' : ''}`}
                onClick={() => update('cellSizeMM', mm)}
              >
                {mm}mm
              </button>
            ))}
          </div>
        </div>

        {/* Copy count — copy & stroke modes */}
        {config.mode !== 'wordgroup' && (
          <div className="config-group">
            <label className="config-label">每字抄写次数</label>
            <div className="config-options">
              {COPY_OPTIONS.map((n) => (
                <button
                  key={n}
                  className={`config-option config-option-sm${config.copyCount === n ? ' selected' : ''}`}
                  onClick={() => update('copyCount', n)}
                >
                  {n}次
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layout mode — copy mode only */}
        {config.mode === 'copy' && (
          <div className="config-group">
            <label className="config-label">排列方式</label>
            <div className="config-options">
              {LAYOUT_MODES.map((lm) => (
                <button
                  key={lm.value}
                  className={`config-option${config.layoutMode === lm.value ? ' selected' : ''}`}
                  onClick={() => update('layoutMode', lm.value)}
                >
                  {lm.label}
                </button>
              ))}
            </div>
            <span className="config-hint">
              {config.layoutMode === 'compact'
                ? '字间紧凑排列，节省纸张'
                : '每个字独占一行，整齐美观'}
            </span>
          </div>
        )}

        {/* Word group input */}
        {config.mode === 'wordgroup' && (
          <div className="config-group">
            <label className="config-label">基础字</label>
            <input
              type="text"
              className="config-input"
              placeholder="如：中"
              value={wordBaseChar}
              onChange={(e) => setWordBaseChar(e.target.value)}
              maxLength={2}
            />
            <label className="config-label" style={{ marginTop: 8 }}>
              组词
            </label>
            <div className="word-input-row">
              <input
                type="text"
                className="config-input"
                placeholder="如：中国"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddWordPair(); }}
              />
              <button className="btn btn-sm btn-primary" onClick={handleAddWordPair}>
                添加
              </button>
            </div>
            {wordPairs.length > 0 && (
              <div className="word-tags">
                {wordPairs.map((w, i) => (
                  <span key={i} className="word-tag">
                    {w}
                    <button
                      className="word-tag-remove"
                      onClick={() => setWordPairs((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <IconClose size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <button
              className="btn btn-primary config-add-btn"
              onClick={handleAddWordGroup}
              disabled={!wordBaseChar.trim() || wordPairs.length === 0}
            >
              添加组词行
            </button>
            {config.wordGroups && config.wordGroups.length > 0 && (
              <div className="word-group-list">
                {config.wordGroups.map((g, i) => (
                  <div key={i} className="word-group-item">
                    <span className="word-group-char">{g.char}</span>
                    {g.words.map((w, j) => (
                      <span key={j} className="word-group-word">{w}</span>
                    ))}
                    <button
                      className="word-tag-remove"
                      onClick={() => {
                        const groups = config.wordGroups.filter((_, j) => j !== i);
                        update('wordGroups', groups);
                      }}
                    >
                      <IconClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
