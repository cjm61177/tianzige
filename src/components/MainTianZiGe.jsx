import { useRef, useEffect, useState, useCallback } from 'react';
import HanziWriter from 'hanzi-writer';

// Custom data loader — loads from local public/hanzi-data/ instead of CDN
function localCharDataLoader(char, onLoadCharDataSuccess, onLoadCharDataError) {
  fetch(`/hanzi-data/${char}.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => onLoadCharDataSuccess(data))
    .catch((err) => onLoadCharDataError(err));
}

export default function MainTianZiGe({ character, onStrokeCount, onCharData, activeStroke, clickToken, onShowAll }) {
  const containerRef = useRef(null);
  const writerRef = useRef(null);
  const strokeCountRef = useRef(0);
  const scrubVersionRef = useRef(0);
  const isInitialMount = useRef(true);
  const [status, setStatus] = useState('idle');
  const [totalStrokes, setTotalStrokes] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [currentScrubStroke, setCurrentScrubStroke] = useState(0);
  const [speed, setSpeed] = useState(0.5); // 0.25–3, default 0.5

  // Keep HanziWriter in sync with speed setting
  useEffect(() => {
    const writer = writerRef.current;
    if (writer) writer._options.strokeAnimationSpeed = speed;
  }, [speed]);

  // ── Initialize HanziWriter ────────────────────────────────────────
  useEffect(() => {
    if (!character) return;
    const container = containerRef.current;
    if (!container) return;

    while (container.firstChild) container.removeChild(container.firstChild);
    writerRef.current = null;
    strokeCountRef.current = 0;
    scrubVersionRef.current = 0;
    isInitialMount.current = true;

    setStatus('loading');
    setErrorMsg(null);
    setTotalStrokes(0);
    setCurrentScrubStroke(0);
    onStrokeCount?.(0);

    const size = Math.min(container.clientWidth || 360, 360);

    try {
      const writer = HanziWriter.create(container, character, {
        width: size, height: size, padding: 5,
        charDataLoader: localCharDataLoader,
        strokeAnimationSpeed: speed,
        delayBetweenStrokes: 700,
        strokeColor: '#333333',
        radicalColor: '#c44536',
        outlineColor: '#dddddd',
        drawingColor: '#333333',
        showOutline: true,
        showCharacter: true,
        onLoadCharDataSuccess: (data) => {
          const count = data?.strokes?.length || 0;
          strokeCountRef.current = count;
          setTotalStrokes(count);
          onStrokeCount?.(count);
          onCharData?.(data);
          setStatus('ready');
        },
        onLoadCharDataError: () => {
          setErrorMsg(`"${character}" 的笔画数据暂不可用，请尝试其他常用汉字`);
          setStatus('error');
          onStrokeCount?.(0);
        },
      });
      writerRef.current = writer;
    } catch (err) {
      console.error('HanziWriter creation failed:', err);
      setErrorMsg('初始化失败，请刷新页面重试');
      setStatus('error');
    }
  }, [character, onStrokeCount, onCharData]);

  // ── Auto-play on first load ──────────────────────────────────────
  useEffect(() => {
    if (status !== 'ready') return;
    const writer = writerRef.current;
    if (!writer) return;

    const timer = setTimeout(() => {
      if (writerRef.current !== writer) return;
      setStatus('playing');
      scrubVersionRef.current = 0;
      const version = scrubVersionRef.current;
      writer.animateCharacter({
        onComplete: () => {
          if (scrubVersionRef.current === version) setStatus('done');
        },
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [status]);

  // ── Scrub: instant preceding strokes + looping target stroke ─────
  const scrubToStroke = useCallback(async (targetIndex, version) => {
    const writer = writerRef.current;
    if (!writer || targetIndex < 1 || targetIndex > strokeCountRef.current) return;

    setCurrentScrubStroke(targetIndex);

    // Clear canvas synchronously — no await so no paint-frame gap
    try { writer.hideCharacter({ duration: 0 }); } catch (_) {}

    if (scrubVersionRef.current !== version) return;

    // First iteration: draw preceding strokes at ultra-high speed
    if (targetIndex > 1) {
      const origSpeed = writer._options.strokeAnimationSpeed;
      writer._options.strokeAnimationSpeed = 2000;

      for (let i = 0; i < targetIndex - 1; i++) {
        if (scrubVersionRef.current !== version) return;
        try { await writer.animateStroke(i); } catch (_) {}
      }

      writer._options.strokeAnimationSpeed = origSpeed;
    }

    // Loop: keep animating the target stroke until version changes
    while (scrubVersionRef.current === version) {
      if (scrubVersionRef.current !== version) break;
      try { await writer.animateStroke(targetIndex - 1); } catch (_) {}
    }
  }, []);

  // ── Respond to clickToken changes (every stroke click / show-all) ──
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!writerRef.current || status === 'loading' || status === 'error') return;

    // Cancel any running scrub loop
    scrubVersionRef.current += 1;
    const version = scrubVersionRef.current;

    if (activeStroke === 0) {
      // Show all — reset canvas then play full character
      setCurrentScrubStroke(0);
      setStatus('playing');
      const writer = writerRef.current;
      try { writer.hideCharacter({ duration: 0 }); } catch (_) {}
      writer.animateCharacter({
        onComplete: () => {
          if (scrubVersionRef.current === version) setStatus('done');
        },
      });
    } else {
      // Scrub to specific stroke (loops)
      setStatus('paused');
      scrubToStroke(activeStroke, version);
    }
  }, [clickToken]);

  // ── Button handlers ──────────────────────────────────────────────
  // play (idle/done → play), pause (playing → pause), resume (paused → play)
  const handlePlayPause = useCallback(() => {
    const writer = writerRef.current;
    if (!writer) return;
    if (status === 'playing') {
      writer.pauseAnimation();
      setStatus('paused');
    } else if (status === 'paused') {
      writer.resumeAnimation();
      setStatus('playing');
    } else {
      // Idle or done → start full play via effect
      onShowAll?.();
    }
  }, [status, onShowAll]);

  const handleShowAll = useCallback(() => {
    onShowAll?.();
  }, [onShowAll]);

  // ── Derived display values ────────────────────────────────────────
  const buttonLabel =
    status === 'playing' ? '⏸ 暂停' : status === 'paused' ? '▶ 继续' : '▶ 播放';

  return (
    <div className="main-tianzige-wrapper">
      {status === 'error' ? (
        <div className="tianzige-error">{errorMsg}</div>
      ) : (
        <div ref={containerRef} className="main-tianzige">
          {status === 'loading' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-secondary)', fontSize: 14, zIndex: 3,
            }}>
              加载中...
            </div>
          )}
        </div>
      )}

      {totalStrokes > 0 && status !== 'error' && (
        <div className="controls">
          <div className="stroke-info">
            共 <strong>{totalStrokes}</strong> 画
            {activeStroke > 0 && (
              <span style={{ color: 'var(--primary)', marginLeft: 6, fontSize: 15, fontWeight: 600 }}>
                · 第{currentScrubStroke || activeStroke}画
              </span>
            )}
          </div>

          <div className="control-buttons">
            <button onClick={handlePlayPause} className="btn btn-primary">
              {buttonLabel}
            </button>
            {(status === 'paused' || activeStroke > 0) && (
              <button onClick={handleShowAll} className="btn btn-outline">显示全部</button>
            )}
          </div>

          <div className="speed-control">
            <span className="speed-label">速度</span>
            <button
              className={`btn btn-sm ${speed === 0.5 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSpeed(0.5)}
            >
              慢
            </button>
            <button
              className={`btn btn-sm ${speed === 0.7 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSpeed(0.7)}
            >
              快
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
