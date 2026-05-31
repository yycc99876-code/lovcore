import React from 'react';
import { useTranslation } from '../../../i18n';

interface CTASceneProps {
  isActive: boolean;
  renderVaultForm: () => React.ReactNode;
}

export const CTAScene: React.FC<CTASceneProps> = ({ isActive, renderVaultForm }) => {
  const { t } = useTranslation();

  return (
    <div className={`chapter-content chapter-4-content ${isActive ? 'active' : ''}`}>
      <h2 className="chapter-4-title font-serif">{t.landing.footer}</h2>
      <div className="gsap-vault-panel">
        <div className="vault-panel-blur-bg" />
        <div className="vault-card-body">{renderVaultForm()}</div>
      </div>
      <p className="cta-subtitle">{t.landing.mascotHint}</p>
    </div>
  );
};
