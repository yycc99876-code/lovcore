import React from 'react';

interface SerendipitySceneProps {
  isActive: boolean;
  swipeResult: 'forget' | 'keep' | null;
}

export const SerendipityScene: React.FC<SerendipitySceneProps> = ({ isActive, swipeResult: _swipeResult }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  return (
    <div className={`chapter-content narrative-text-col chapter-3-content ${isActive ? 'active' : ''}`}>
      <span className="chapter-label">03 / 重逢</span>
      <h2 className="gsap-title" style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', whiteSpace: 'pre-line', marginBottom: '24px' }}>
        {'让值得保存的瞬间，\n再次被看见。'}
      </h2>
      <p className="gsap-desc" style={{ fontSize: '14px', color: 'rgba(0,0,0,0.7)', whiteSpace: 'pre-line', lineHeight: 1.8, maxWidth: '90%' }}>
        回响不会催你清空内容。它只是把曾经保存过的卡片重新带到你面前，让你慢慢判断：这一次，是放下，还是保留。
      </p>
      <div className="feature-bullets capture-features">
        <div className="feature-bullet"><span className="feature-index">01</span><span>一张一张重新看见</span></div>
        <div className="feature-bullet"><span className="feature-index">02</span><span>左滑放下，右滑保留</span></div>
        <div className="feature-bullet"><span className="feature-index">03</span><span>让重要内容再次浮现</span></div>
      </div>
    </div>
  );
};
