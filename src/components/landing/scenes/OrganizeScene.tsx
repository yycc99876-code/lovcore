import React from 'react';

interface OrganizeSceneProps {
  isActive: boolean;
}

export const OrganizeScene: React.FC<OrganizeSceneProps> = ({ isActive }) => {
  return (
    <div className={`chapter-content narrative-text-col chapter-2-content ${isActive ? 'active' : ''}`}>
      <span className="chapter-label">02 / 归档</span>
      <h2 className="gsap-title" style={{ fontSize: 'clamp(28px, 3.5vw, 42px)', whiteSpace: 'pre-line', marginBottom: '24px' }}>
        {'把重要的灵感，\n亲手收进一处。'}
      </h2>
      <p className="gsap-desc" style={{ fontSize: '14px', color: 'rgba(0,0,0,0.7)', whiteSpace: 'pre-line', lineHeight: 1.8, maxWidth: '90%' }}>
        不是让所有内容堆在一起。Lovcore 让你为不同主题创建收藏集，用颜色和封面区分它们，把真正有关联的卡片放到同一个地方。
      </p>
      <div className="feature-bullets capture-features">
        <div className="feature-bullet"><span className="feature-index">01</span><span>为主题创建收藏集</span></div>
        <div className="feature-bullet"><span className="feature-index">02</span><span>用颜色和封面快速识别</span></div>
        <div className="feature-bullet"><span className="feature-index">03</span><span>停留时预览这一组内容</span></div>
      </div>
    </div>
  );
};
