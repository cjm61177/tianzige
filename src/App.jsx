import { useState, useCallback } from 'react';
import MainTianZiGe from './components/MainTianZiGe';
import StrokeBreakdown from './components/StrokeBreakdown';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [character, setCharacter] = useState('');
  const [strokeCount, setStrokeCount] = useState(0);
  const [activeStroke, setActiveStroke] = useState(0);
  const [clickToken, setClickToken] = useState(0);
  const [charData, setCharData] = useState(null);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);

    const chineseChars = val.match(/[一-鿿]/g);
    if (chineseChars && chineseChars.length > 0) {
      const lastChar = chineseChars[chineseChars.length - 1];
      if (lastChar !== character) {
        setCharacter(lastChar);
        setActiveStroke(0);
        setClickToken(0);
        setCharData(null);
      }
    } else if (val === '') {
      setCharacter('');
      setStrokeCount(0);
      setActiveStroke(0);
      setClickToken(0);
    }
  }, [character]);

  const handleStrokeCount = useCallback((count) => {
    setStrokeCount(count);
  }, []);

  const handleStrokeClick = useCallback((strokeIndex) => {
    setActiveStroke(strokeIndex);
    setClickToken((c) => c + 1);
  }, []);

  // Called by MainTianZiGe buttons (play/replay/show-all) —
  // triggers the effect to play the full character.
  const handleShowAll = useCallback(() => {
    setActiveStroke(0);
    setClickToken((c) => c + 1);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>田字格</h1>
        <p className="subtitle">汉字笔画学习 · 逐笔拆解</p>
      </header>

      {/* Input */}
      <div className="input-area">
        <input
          type="text"
          className="char-input"
          placeholder="输入一个汉字，如：永"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={10}
          autoFocus
        />
        <p className="input-hint">
          支持输入词语或单字，取最后一个汉字
        </p>
      </div>

      {/* Main 田字格 */}
      {character ? (
        <ErrorBoundary>
          <div className="main-section">
            <MainTianZiGe
              character={character}
              onStrokeCount={handleStrokeCount}
              onCharData={setCharData}
              activeStroke={activeStroke}
              clickToken={clickToken}
              onShowAll={handleShowAll}
            />
          </div>
        </ErrorBoundary>
      ) : (
        <div className="empty-state">
          <p>在上方输入一个汉字<br />查看笔画书写动画</p>
        </div>
      )}

      {/* Stroke Breakdown */}
      <ErrorBoundary>
        <StrokeBreakdown
          character={character}
          totalStrokes={strokeCount}
          charData={charData}
          activeStroke={activeStroke}
          onStrokeClick={handleStrokeClick}
        />
      </ErrorBoundary>
    </div>
  );
}

export default App;
