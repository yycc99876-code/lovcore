'use client';

import { useState } from 'react';
import { useTranslation } from '../i18n';

const SPACE_COLORS = [
  '#f6df4f',
  '#7a55d8',
  '#f04e59',
  '#6ce8a8',
  '#b6bbc7',
  '#ff8fa3',
  '#111111',
  '#22a6c8',
  '#2ebb78',
  '#ff9060',
  '#b8add8',
  '#a8d4d8',
  '#f0a000',
  '#9be000',
  '#2270e8',
  '#ffd9ce',
];

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
}

export const CreateSpaceModal = ({ isOpen, onClose, onCreate }: CreateSpaceModalProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'name' | 'color'>('name');
  const [name, setName] = useState('');
  const [color, setColor] = useState(SPACE_COLORS[0]);

  if (!isOpen) return null;

  const handleClose = () => {
    setStep('name');
    setName('');
    setColor(SPACE_COLORS[0]);
    onClose();
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name, color);
    handleClose();
  };

  return (
    <div className="space-modal-backdrop" onClick={handleClose}>
      <div className="space-create-modal" onClick={(event) => event.stopPropagation()}>
        {step === 'name' ? (
          <>
            <div className="space-rings" aria-hidden="true">
              {SPACE_COLORS.slice(0, 5).map((item, index) => (
                <span key={item} style={{ borderColor: item, transform: `translateX(${(index - 2) * 12}px)` }} />
              ))}
            </div>
            <h2>{t.createSpace.title}</h2>
            <p>{t.createSpace.desc}</p>
            <input
              autoFocus
              className="space-name-input"
              placeholder={t.createSpace.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim()) setStep('color');
              }}
            />
            <button
              className="space-next-btn"
              disabled={!name.trim()}
              onClick={() => setStep('color')}
            >
              {t.createSpace.nextStep}
            </button>
            <button className="smart-space-link" type="button">
              {t.createSpace.smartFolioLink}
            </button>
          </>
        ) : (
          <>
            <h2>{t.createSpace.pickColor}</h2>
            <p>{t.createSpace.colorDesc}</p>
            <div className="space-color-wheel">
              {SPACE_COLORS.map((item) => (
                <button
                  key={item}
                  className={`space-color-choice ${color === item ? 'active' : ''}`}
                  style={{ borderColor: item }}
                  onClick={() => setColor(item)}
                  aria-label={`Pick ${item}`}
                />
              ))}
            </div>
            <button className="space-next-btn" onClick={handleCreate}>
              {t.createSpace.finishSave}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
