import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { aiClient } from '../ai/client';
import { useTranslation } from '../i18n';
import { useFocusTrap } from '../hooks/useFocusTrap';

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

export interface SmartSpaceRuleData {
  ruleText: string;
  tags: string[];
  selectedType: string;
  semanticQuery: string;
  description: string;
}

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color: string) => void;
  onCreateSmart?: (name: string, color: string, ruleData: SmartSpaceRuleData) => void;
}

export const CreateSpaceModal = ({ isOpen, onClose, onCreate, onCreateSmart }: CreateSpaceModalProps) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'simple' | 'smart'>('simple');
  const [step, setStep] = useState<'name' | 'rule' | 'color'>('name');
  const [name, setName] = useState('');
  const [color, setColor] = useState(SPACE_COLORS[0]);
  const [ruleText, setRuleText] = useState('');
  const [ruleParsing, setRuleParsing] = useState(false);
  const [ruleParsed, setRuleParsed] = useState(false);
  const [parsedRule, setParsedRule] = useState<SmartSpaceRuleData | null>(null);
  const ruleAbortRef = useRef(0);
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  const resetAll = useCallback(() => {
    setMode('simple');
    setStep('name');
    setName('');
    setColor(SPACE_COLORS[0]);
    setRuleText('');
    setRuleParsing(false);
    setRuleParsed(false);
    setParsedRule(null);
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // Parse rule via AI (debounced)
  useEffect(() => {
    if (mode !== 'smart' || step !== 'rule' || !ruleText.trim()) {
      setRuleParsed(false); // eslint-disable-line react-hooks/set-state-in-effect
      setParsedRule(null);
      return;
    }

    const requestId = ++ruleAbortRef.current;
    setRuleParsing(true);
    setRuleParsed(false);

    const timeout = setTimeout(async () => {
      try {
        const lang = t.landing.heroTitle === 'LOVCORE' ? 'en' : 'zh';
        const result = await aiClient.spaceRule({ ruleText: ruleText.trim(), language: lang });
        if (requestId === ruleAbortRef.current) {
          setParsedRule({
            ruleText: ruleText.trim(),
            tags: result.tags,
            selectedType: result.selectedType,
            semanticQuery: result.semanticQuery,
            description: result.description,
          });
          setRuleParsed(true);
          // Auto-fill name from description if name is empty
          if (!name.trim() && result.description) {
            setName(result.description);
          }
        }
      } catch {
        if (requestId === ruleAbortRef.current) {
          setRuleParsed(false);
        }
      } finally {
        if (requestId === ruleAbortRef.current) {
          setRuleParsing(false);
        }
      }
    }, 800);

    return () => {
      clearTimeout(timeout);
    };
  }, [mode, step, ruleText, name, t]);

  if (!isOpen) return null;

  const cleanName = name.trim();
  const canContinue = cleanName.length > 0;
  const selectedColorIndex = SPACE_COLORS.indexOf(color);

  const handleCreate = () => {
    if (!cleanName) return;

    if (mode === 'smart' && parsedRule) {
      onCreateSmart?.(cleanName, color, parsedRule);
    } else {
      onCreate(cleanName, color);
    }
    handleClose();
  };

  const switchToSmart = () => {
    setMode('smart');
    setStep('rule');
  };

  const switchToSimple = () => {
    setMode('simple');
    setStep('name');
    setRuleText('');
    setParsedRule(null);
    setRuleParsed(false);
  };

  return (
    <div className="space-modal-backdrop" onClick={handleClose}>
      <div
        ref={modalRef}
        className="space-create-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{ '--folio-accent': color } as CSSProperties}
      >
        <button className="space-modal-close" type="button" onClick={handleClose} aria-label="Close">
          ×
        </button>
        {step === 'name' && mode === 'simple' && (
          <>
            <div className="space-modal-orbit" aria-hidden="true">
              {SPACE_COLORS.slice(0, 7).map((item, index) => (
                <span
                  key={item}
                  style={{
                    '--orbit-color': item,
                    '--orbit-offset': `${(index - 3) * 14}px`,
                    '--orbit-delay': `${index * 90}ms`,
                  } as CSSProperties}
                />
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
                if (event.key === 'Enter' && canContinue) setStep('color');
              }}
            />
            <button
              type="button"
              className={`space-next-btn ${canContinue ? 'ready' : ''}`}
              disabled={!canContinue}
              onClick={() => setStep('color')}
            >
              {t.createSpace.nextStep}
            </button>
            <button className="smart-space-link" type="button" onClick={switchToSmart}>
              {t.createSpace.smartFolioLink}
            </button>
          </>
        )}

        {step === 'rule' && mode === 'smart' && (
          <>
            <h2>{t.createSpace.smartTitle}</h2>
            <p>{t.createSpace.smartDesc}</p>
            <textarea
              autoFocus
              className="space-rule-input"
              placeholder={t.createSpace.rulePlaceholder}
              value={ruleText}
              onChange={(event) => setRuleText(event.target.value)}
              rows={3}
            />
            {ruleParsing && (
              <div className="space-rule-status parsing">
                <span className="spin" />
                {t.createSpace.ruleParsing}
              </div>
            )}
            {ruleParsed && parsedRule && (
              <div className="space-rule-status parsed">
                {t.createSpace.ruleParsed}
                {parsedRule.tags.length > 0 && (
                  <span className="rule-tags">
                    {parsedRule.tags.map((tag) => (
                      <span key={tag} className="rule-tag">{tag}</span>
                    ))}
                  </span>
                )}
              </div>
            )}
            <input
              className="space-name-input"
              placeholder={t.createSpace.namePlaceholder}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button
              type="button"
              className={`space-next-btn ${canContinue ? 'ready' : ''}`}
              disabled={!canContinue}
              onClick={() => setStep('color')}
            >
              {t.createSpace.nextStep}
            </button>
            <button className="smart-space-link" type="button" onClick={switchToSimple}>
              {t.createSpace.backToSimple}
            </button>
          </>
        )}

        {step === 'color' && (
          <>
            <div className="space-color-preview" aria-hidden="true">
              <span style={{ background: color }} />
              <strong>{cleanName}</strong>
            </div>
            <h2>{t.createSpace.pickColor}</h2>
            <p>{t.createSpace.colorDesc}</p>
            <div className="space-color-wheel">
              {SPACE_COLORS.map((item, index) => (
                <button
                  key={item}
                  className={`space-color-choice ${color === item ? 'active' : ''}`}
                  style={{ '--choice-color': item, '--choice-angle': `${index * 22.5}deg` } as CSSProperties}
                  onClick={() => setColor(item)}
                  aria-label={`Pick ${item}`}
                />
              ))}
            </div>
            <button
              type="button"
              className={`space-next-btn ${selectedColorIndex >= 0 ? 'ready' : ''}`}
              onClick={handleCreate}
            >
              {t.createSpace.finishSave}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
