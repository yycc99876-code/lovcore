import React from 'react';
import { useTranslation } from '../../../i18n';

interface CaptureSceneProps {
  isActive: boolean;
}

export const CaptureScene: React.FC<CaptureSceneProps> = ({ isActive }) => {
  const { t } = useTranslation();

  return (
    <div className={`chapter-content narrative-text-col chapter-1-content ${isActive ? 'active' : ''}`}>
      <span className="chapter-label">{t.landing.ch1Label}</span>
      <h2 className="gsap-title">
        {t.landing.ch1Title}
      </h2>
      <p className="gsap-desc">
        {t.landing.ch1Desc}
      </p>
      <div className="feature-bullets capture-features">
        <div className="feature-bullet"><span className="feature-index">01</span><span>{t.landing.feature1}</span></div>
        <div className="feature-bullet"><span className="feature-index">02</span><span>{t.landing.feature2}</span></div>
        <div className="feature-bullet"><span className="feature-index">03</span><span>{t.landing.feature3}</span></div>
      </div>
      
      <div className="capture-shortcuts-section">
        <div className="shortcuts-row">
          <span className="shortcut-item">
            <span className="key">/</span>
            <span className="label">快捷记录</span>
          </span>
          <div className="divider" />
          <span className="shortcut-item">
            <span className="key">Insert</span>
            <span className="label">语音输入</span>
          </span>
          <div className="divider" />
          <span className="shortcut-item">
            <span className="key">Ctrl + Insert</span>
            <span className="label">免提</span>
          </span>
        </div>
        <p className="shortcut-desc">在任意位置，按下快捷键即可开始捕捉你的想法。</p>
      </div>
    </div>
  );
};
