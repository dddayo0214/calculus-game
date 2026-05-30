import React, { useState, useEffect } from 'react';
import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import './App.css';
import gameData from './data.json';

const audioCorrect = new Audio("/sounds/vtuber1-mp3cut(CorrectAns).mp3");
const audioWrong = new Audio("/sounds/minato-aqua-wtf(WrongAns).mp3");
const bgmAudio = new Audio();

function App() {
  const [currentUnitIdx, setCurrentUnitIdx] = useState(null);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [highScores, setHighScores] = useState(() => {
    const saved = localStorage.getItem('calculus_highscores');
    return saved ? JSON.parse(saved) : {};
  });

  const currentUnit = currentUnitIdx !== null ? gameData.units[currentUnitIdx] : null;
  const containerStyle = {
    backgroundImage: currentUnit
      ? `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("${currentUnit.bg_path}")`
      : `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("/images/miko(bg).jpg")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    transition: 'background 0.5s ease-in-out',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  };

  // 1. 同步音量與靜音狀態
  useEffect(() => {
    const finalVolume = isMuted ? 0 : volume;
    bgmAudio.volume = finalVolume;
    audioCorrect.volume = finalVolume;
    audioWrong.volume = finalVolume;
    bgmAudio.loop = true;
  }, [volume, isMuted]);

  // 2. 計時器邏輯
  useEffect(() => {
    let timer;
    if (currentUnitIdx !== null && !isFinished && selectedIdx === null && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && selectedIdx === null && currentUnitIdx !== null) {
      handleAnswer(-1); // 時間到自動判定錯誤
    }
    return () => clearInterval(timer);
  }, [timeLeft, currentUnitIdx, isFinished, selectedIdx]);

  // 3. 進入遊戲與單元選擇
  const startGame = () => {
    setGameStarted(true);
    bgmAudio.play().catch(e => console.log("BGM 播放被攔截"));
  };

  const handleSelectUnit = (idx) => {
    const selectedUnit = gameData.units[idx];

    switchBGM(selectedUnit.bgm_path);

    setCurrentUnitIdx(idx);
    setCurrentQIdx(0);
    setScore(0);
    setTimeLeft(15);
    setSelectedIdx(null);
    setIsFinished(false);

    bgmAudio.loop = true;
    bgmAudio.play().catch(e => console.log("切換音樂失敗:", e));
  };

  const switchBGM = (newPath) => {
    const fadeOutInterval = setInterval(() => {
      if (bgmAudio.volume > 0.05) {
        bgmAudio.volume -= 0.05;
      } else {
        clearInterval(fadeOutInterval);
        bgmAudio.pause();

        bgmAudio.src = newPath;
        bgmAudio.load();
        bgmAudio.play();

        const fadeInInterval = setInterval(() => {
          if (bgmAudio.volume < volume - 0.05) {
            bgmAudio.volume += 0.05;
          } else {
            bgmAudio.volume = volume;
            clearInterval(fadeInInterval);
          }
        }, 50);
      }
    }, 50);
  };

  const playSound = (audio) => {
    if (isMuted) return;
    audio.currentTime = 0;
    audio.play().catch(e => console.log("播放被攔截"));
  };

  const fadeOutBGM = () => {
    const fadeInterval = setInterval(() => {
      if (bgmAudio.volume > 0.05) {
        bgmAudio.volume -= 0.05;
      } else {
        bgmAudio.currentTime = 0;
        bgmAudio.pause();
        bgmAudio.volume = volume;
        clearInterval(fadeInterval);
      }
    }, 100);
  };

  const handleAnswer = (idx) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);

    const unit = gameData.units[currentUnitIdx];
    const q = unit.questions[currentQIdx];
    const isCorrect = idx === q.answer;

    if (isCorrect) {
      const points = 100 + (timeLeft * 10);
      setScore(prev => prev + points);
      playSound(audioCorrect);
    } else {
      playSound(audioWrong);
    }

    setTimeout(() => {
      if (currentQIdx + 1 < unit.questions.length) {
        setCurrentQIdx(prev => prev + 1);
        setSelectedIdx(null);
        setTimeLeft(15);
      } else {
        setIsFinished(true);
        fadeOutBGM();
        // 儲存最高分
        const unitKey = `unit_${unit.unit_id}`;
        const finalScore = isCorrect ? score + (100 + timeLeft * 10) : score;
        if (finalScore > (highScores[unitKey] || 0)) {
          const newHighs = { ...highScores, [unitKey]: finalScore };
          setHighScores(newHighs);
          localStorage.setItem('calculus_highscores', JSON.stringify(newHighs));
        }
      }
    }, 1000);
  };

  const handleReset = () => {
    setCurrentUnitIdx(null);
    setIsFinished(false);
    // 重新點選單元時會再啟動 BGM
  };

  // 畫面渲染邏輯...
  if (!gameStarted) {
    return (
      <div className="game-container" style={containerStyle}>
        <div className="game-card">
          <h1 className="title">📐 微積分公式大挑戰</h1>
          <button className="unit-button" onClick={startGame}>進入遊戲</button>
        </div>
      </div>
    );
  }

  if (currentUnitIdx === null) {
    return (
      <div className="game-container" style={containerStyle}>
        <button className="settings-toggle" onClick={() => setIsSettingsOpen(true)}>⚙️ 設定</button>
        {isSettingsOpen && (
          <SettingsPanel
            volume={volume}
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
        <div className="game-card">
          <h1 className="title">🧪 選擇單元</h1>
          {gameData.units.map((unit, idx) => (
            <button key={idx} onClick={() => handleSelectUnit(idx)} className="unit-button">
              {unit.unit_name}
              <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>最高分: {highScores[`unit_${unit.unit_id}`] || 0}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isFinished) {
    const unit = gameData.units[currentUnitIdx];
    return (
      <div className="game-container" style={containerStyle}>
        <div className="game-card">
          <h2 className="title">🎉 挑戰完成！</h2>
          <div style={{ fontSize: '3rem' }}>{score} 分</div>
          <p>答對題數：{Math.round(score / 150)} 提</p>
          <button onClick={handleReset} className="unit-button">返回選單</button>
        </div>
      </div>
    );
  }

  // 遊戲中畫面
  const unitActive = gameData.units[currentUnitIdx];
  const qActive = unitActive.questions[currentQIdx];
  const progressPercent = (currentQIdx / unitActive.questions.length) * 100;

  return (
    <div className="game-container" style={containerStyle}>
      <button className="settings-toggle" onClick={() => setIsSettingsOpen(true)}>⚙️ 設定</button>
      {isSettingsOpen && (
        <SettingsPanel
          volume={volume}
          setVolume={setVolume}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      <div className="game-card">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }}></div>
        </div>
        <div className={`timer ${timeLeft <= 5 ? 'timer-urgent' : ''}`}>⏱ {timeLeft}s</div>

        <p>第 {currentQIdx + 1} 題 / 共 {unitActive.questions.length} 題</p>
        <div style={{ margin: '20px 0', fontSize: '1.5rem' }}>
          <BlockMath math={qActive.question} />
        </div>

        <div className="option-grid">
          {qActive.options.map((opt, idx) => {
            let statusClass = "";
            if (selectedIdx !== null) {
              if (idx === qActive.answer) statusClass = "correct";
              else if (idx === selectedIdx) statusClass = "wrong";
            }
            return (
              <button key={idx} onClick={() => handleAnswer(idx)} className={`option-button ${statusClass}`} disabled={selectedIdx !== null}>
                <InlineMath math={opt} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;

function SettingsPanel({ volume, setVolume, isMuted, setIsMuted, onClose }) {
  return (
    <div className="settings-overlay">
      <div className="settings-panel">
        <h3>遊戲設定</h3>
        <div className="setting-item">
          <label>音量：{Math.round(volume * 100)}%</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setIsMuted(!isMuted)}
              style={{ fontSize: '24px', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>
        <button className="unit-button" onClick={onClose}>關閉</button>
      </div>
    </div>
  );
}