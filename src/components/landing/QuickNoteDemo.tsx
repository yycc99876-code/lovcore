import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Expand, X, Mic, Image as ImageIcon, Type, Heading1, List, Wand2 } from 'lucide-react';
import { LogoIcon } from '../LogoIcon';

interface QuickNoteDemoProps {
  isActive: boolean;
  isSmall?: boolean;
  onComplete?: () => void;
}

const PAPER_COLORS = [
  '#ffffff', // Default
  '#f3f0ff', // Purple hint
  '#fff0f6', // Pink hint
  '#e6f7ff', // Blue hint
  '#f6ffed', // Green hint
  '#fff7e6', // Orange hint
  '#f5f5f5', // Grey
  '#e6fffb'  // Cyan hint
];

export const QuickNoteDemo: React.FC<QuickNoteDemoProps> = ({ isActive, isSmall = false, onComplete: _onComplete }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
  const containerRef = useRef<HTMLDivElement>(null);
  
  // States
  const [slashTyped, setSlashTyped] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuSelection, setSlashMenuSelection] = useState<number>(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploaded, setImageUploaded] = useState(false);
  
  const [typedText, setTypedText] = useState('');
  const [showTypo, setShowTypo] = useState(false);
  const [typoCorrected, setTypoCorrected] = useState(false);
  const [ghostText, setGhostText] = useState('');
  const [showVoice, setShowVoice] = useState(false);
  const [showCorrectionPopover, setShowCorrectionPopover] = useState(false);
  const [showCompletionPopover, setShowCompletionPopover] = useState(false);
  const [completionAccepted, setCompletionAccepted] = useState(false);
  
  const [highlightedForAI, setHighlightedForAI] = useState(false);
  const [showAIRefineBox, setShowAIRefineBox] = useState(false);
  const [aiRefinePrompt, setAiRefinePrompt] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  const [showDiff, setShowDiff] = useState(false);
  const [diffAccepted, setDiffAccepted] = useState(false);
  
  const [selectedSwatchIndex, setSelectedSwatchIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const [loopCount, setLoopCount] = useState(0);

  useEffect(() => {
    if (!isActive) {
      // Reset all states when inactive to prevent leakage
      setSlashTyped(false); // eslint-disable-line react-hooks/set-state-in-effect
      setShowSlashMenu(false);
      setSlashMenuSelection(0);
      setIsUploadingImage(false);
      setImageUploaded(false);
      setTypedText('');
      setShowTypo(false);
      setTypoCorrected(false);
      setGhostText('');
      setShowVoice(false);
      setShowCorrectionPopover(false);
      setShowCompletionPopover(false);
      setCompletionAccepted(false);
      setHighlightedForAI(false);
      setShowAIRefineBox(false);
      setAiRefinePrompt('');
      setIsAIThinking(false);
      setShowDiff(false);
      setDiffAccepted(false);
      setSelectedSwatchIndex(0);
      setIsSaving(false);
      setIsCompleted(false);
      return;
    }

    const tl = gsap.timeline({
      delay: 0.5,
      onComplete: () => {
        setIsCompleted(true);
        setTimeout(() => setLoopCount(prev => prev + 1), 4000);
      }
    });

    // Reset all
    setSlashTyped(false); setShowSlashMenu(false); setSlashMenuSelection(0);
    setIsUploadingImage(false); setImageUploaded(false);
    setTypedText(''); setShowTypo(false); setTypoCorrected(false); setGhostText('');
    setShowVoice(false); setShowCorrectionPopover(false); setShowCompletionPopover(false);
    setCompletionAccepted(false); setHighlightedForAI(false); setShowAIRefineBox(false);
    setAiRefinePrompt(''); setIsAIThinking(false); setShowDiff(false); setDiffAccepted(false);
    setSelectedSwatchIndex(0); setIsSaving(false); setIsCompleted(false);

    // Phase 1: Slash Command
    tl.call(() => setSlashTyped(true), undefined, "+=0.3");
    tl.call(() => setShowSlashMenu(true), undefined, "+=0.4");
    
    // Scroll selection down to Image
    tl.call(() => setSlashMenuSelection(1), undefined, "+=0.6");
    tl.call(() => setSlashMenuSelection(2), undefined, "+=0.3");
    tl.call(() => setSlashMenuSelection(3), undefined, "+=0.3");
    
    // Select Image
    tl.call(() => {
      setShowSlashMenu(false);
      setSlashTyped(false);
      setIsUploadingImage(true);
    }, undefined, "+=0.4");
    
    // Image Uploading ends
    tl.call(() => {
      setIsUploadingImage(false);
      setImageUploaded(true);
    }, undefined, "+=1.5");

    // Phase 2: Voice Dictation
    tl.call(() => setShowVoice(true), undefined, "+=0.5");
    
    const part1 = "2026红杉资本在旧金山举办了第四届AI峰会，";
    const part2 = "红衫"; // Typo
    const part3 = "合伙人指出";
    const ghost = "，AI不只是互联网时代的重大技术革命，更是重塑全球经济和产业格局的核心动力。";

    const proxy1 = { p: 0 };
    tl.to(proxy1, { p: 1, duration: 1.2, onUpdate: () => setTypedText(part1.substring(0, Math.floor(proxy1.p * part1.length))) });
    
    const proxy2 = { p: 0 };
    tl.to(proxy2, { p: 1, duration: 0.3, onUpdate: () => setTypedText(part1 + part2.substring(0, Math.floor(proxy2.p * part2.length))) });
    
    const proxy3 = { p: 0 };
    tl.to(proxy3, { p: 1, duration: 0.5, onUpdate: () => setTypedText(part1 + part2 + part3.substring(0, Math.floor(proxy3.p * part3.length))) });

    // Voice off, show typo
    tl.call(() => { setShowVoice(false); setShowTypo(true); }, undefined, "+=0.2");
    tl.call(() => setShowCorrectionPopover(true), undefined, "+=0.3");
    tl.call(() => { setShowCorrectionPopover(false); setTypoCorrected(true); }, undefined, "+=1.2");
    
    tl.call(() => { setGhostText(ghost); setShowCompletionPopover(true); }, undefined, "+=0.5");
    tl.call(() => { setGhostText(''); setCompletionAccepted(true); setShowCompletionPopover(false); }, undefined, "+=1.2");

    // Phase 3: AI Refinement
    // Highlight "2026红杉资本在旧金山举办了第四届AI峰会"
    tl.call(() => setHighlightedForAI(true), undefined, "+=1.0");
    tl.call(() => setShowAIRefineBox(true), undefined, "+=0.4");
    
    // Type AI prompt
    const aiPrompt = "让表达更自然，但保留原本观点";
    const proxyPrompt = { p: 0 };
    tl.to(proxyPrompt, { p: 1, duration: 1.0, onUpdate: () => setAiRefinePrompt(aiPrompt.substring(0, Math.floor(proxyPrompt.p * aiPrompt.length))) });
    
    tl.call(() => setIsAIThinking(true), undefined, "+=0.3");
    tl.call(() => {
      setIsAIThinking(false);
      setShowAIRefineBox(false);
      setShowDiff(true);
    }, undefined, "+=1.5");
    
    tl.call(() => {
      setShowDiff(false);
      setDiffAccepted(true);
      setHighlightedForAI(false);
    }, undefined, "+=2.0"); // Wait for user to read diff

    // Phase 4: Theme & Save
    tl.call(() => setSelectedSwatchIndex(3), undefined, "+=0.8"); // Blue hint
    tl.call(() => setSelectedSwatchIndex(4), undefined, "+=0.6"); // Green hint
    tl.call(() => setIsSaving(true), undefined, "+=0.8");
    tl.call(() => setIsSaving(false), undefined, "+=0.3");

    return () => { tl.kill(); };
  }, [isActive, loopCount]);

  return (
    <div className="qn-container" ref={containerRef} style={{ background: PAPER_COLORS[selectedSwatchIndex] }}>
      <div className="qn-bg-gradient" style={{ opacity: selectedSwatchIndex === 0 ? 1 : 0.4 }} />
      
      <div className="qn-header" style={{ marginBottom: isSmall ? '24px' : '0' }}>
        <span className="qn-title" style={isSmall ? { color: '#FF6B4A', fontSize: '15px', fontWeight: 500, letterSpacing: '0.05em' } : {}}>新建速记</span>
        <div className="qn-window-controls">
          <Expand className="qn-expand-btn" size={isSmall ? 16 : 14} style={isSmall ? { color: '#9CA3AF' } : {}} />
          {!isSmall && <X size={16} />}
        </div>
      </div>

      {!isSmall ? (
        <>
          <div className="qn-editor">
            <div className="qn-content">
            
            {/* Phase 1: Slash Command */}
            {slashTyped && (
              <div className="qn-slash-trigger">
                /
                {showSlashMenu && (
                  <div className="qn-slash-menu">
                    <div className="qn-menu-group">基础</div>
                    <div className={`qn-menu-item ${slashMenuSelection === 0 ? 'selected' : ''}`}><Type size={16} /><div><span>正文</span><small>段落文本</small></div><span className="qn-shortcut">/zw</span></div>
                    <div className={`qn-menu-item ${slashMenuSelection === 1 ? 'selected' : ''}`}><Heading1 size={16} /><div><span>标题1</span><small>一级标题</small></div><span className="qn-shortcut">/bt1</span></div>
                    <div className="qn-menu-group">插入</div>
                    <div className={`qn-menu-item ${slashMenuSelection === 2 ? 'selected' : ''}`}><List size={16} /><div><span>无序列表</span><small>无序列表</small></div><span className="qn-shortcut">/wxlb</span></div>
                    <div className={`qn-menu-item ${slashMenuSelection === 3 ? 'selected' : ''}`}><ImageIcon size={16} /><div><span>图片</span><small>从文件夹选择图片</small></div><span className="qn-shortcut">/tp</span></div>
                  </div>
                )}
              </div>
            )}

            {isUploadingImage && (
              <div className="qn-image-placeholder">
                <ImageIcon size={24} className="spin-pulse" /> <span>上传中...</span>
              </div>
            )}

            {imageUploaded && (
              <div className="qn-uploaded-image">
                <img src="/demo-ai-conf.png" alt="AI Conference" />
              </div>
            )}

            {/* Text Content */}
            {(!slashTyped && !isUploadingImage && (typedText !== '' || imageUploaded)) && (
              <div className="qn-text-block">
                {showDiff ? (
                  <span className="qn-diff-view">
                    <del>2026</del><ins>近日，</ins><span>红杉资本在旧金山举办了</span><ins>的</ins><span>第四届AI峰会</span><ins>上</ins><span>，</span>
                    <span className={`qn-typo ${typoCorrected ? 'corrected' : ''}`}>红杉</span>
                    <span>合伙人</span><ins>明确</ins><span>指出</span>
                    {completionAccepted && <span>，AI不只是互联网时代的重大技术革命，更是重塑全球经济和产业格局的核心动力。</span>}
                    
                    <div className="qn-popover diff-popover">
                      <span className="qn-popover-kbd"><span className="kbd">Tab</span> 接受修改</span>
                    </div>
                  </span>
                ) : diffAccepted ? (
                  <span>
                    近日，红杉资本在旧金山举办的第四届AI峰会上，红杉合伙人明确指出
                    {completionAccepted && <span>，AI不只是互联网时代的重大技术革命，更是重塑全球经济和产业格局的核心动力。</span>}
                  </span>
                ) : (
                  <span className={highlightedForAI ? 'qn-highlighted' : ''}>
                    {showTypo ? (
                      <>
                        <span>2026红杉资本在旧金山举办了第四届AI峰会，</span>
                        <span className={`qn-typo ${typoCorrected ? 'corrected' : ''}`}>
                          {typoCorrected ? '红杉' : '红衫'}
                          {showCorrectionPopover && (
                            <div className="qn-popover correction-popover">
                              <span className="qn-popover-text">REPLACE WITH <strong>红杉</strong></span>
                              <span className="qn-popover-kbd"><span className="kbd">Tab</span> 接受修改</span>
                            </div>
                          )}
                        </span>
                        <span>合伙人指出</span>
                        {completionAccepted && <span>，AI不只是互联网时代的重大技术革命，更是重塑全球经济和产业格局的核心动力。</span>}
                      </>
                    ) : (
                      <span>{typedText}</span>
                    )}
                  </span>
                )}
                
                {ghostText && !showDiff && !diffAccepted && (
                  <span className="qn-ghost-text">
                    {ghostText}
                  </span>
                )}
                
                {/* Blinking Cursor */}
                {!isCompleted && !showSlashMenu && !showAIRefineBox && !showDiff && <span className="qn-cursor" />}
              </div>
            )}

            {/* AI Refine Popover */}
            {showAIRefineBox && (
              <div className="qn-ai-refine-box">
                <Wand2 size={16} className="ai-icon" />
                <div className="ai-input">
                  {aiRefinePrompt === '' ? <span className="ai-placeholder">例如：让表达更自然，但保留原本观点</span> : aiRefinePrompt}
                  <span className="qn-cursor" />
                </div>
                {isAIThinking ? <LogoIcon size={16} className="spin-pulse" /> : <Mic size={16} className="mic-icon" />}
              </div>
            )}
            </div>
          </div>

          {/* Voice Popover */}
          {showVoice && (
            <div className="qn-voice-popover">
              <div className="qn-voice-logo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
              </div>
              <div className="qn-voice-text">
                <div className="qn-voice-title">TRANSCRIBING...</div>
                <div className="qn-voice-sub">Transcribing...</div>
              </div>
              <div className="qn-voice-waves">
                <span className="wave w1"/><span className="wave w2"/><span className="wave w3"/><span className="wave w4"/>
              </div>
              <div className="qn-voice-btn">
                <Mic size={14} />
              </div>
            </div>
          )}

          {/* Completion Popover */}
          {showCompletionPopover && (
            <div className="qn-popover completion-popover">
              <span className="qn-popover-kbd"><span className="kbd">Tab</span> 接受补全</span>
            </div>
          )}

          {/* Footer Toolbar */}
          <div className="qn-footer">
            <div className="qn-commands-hint">/ 命令 · Insert 语音 · Ctrl+Insert 免提 <span className="qn-help-icon">?</span></div>
            <div className="qn-toolbar-bottom">
              <div className="qn-paper-label">PAPER</div>
              <div className="qn-swatches">
                {PAPER_COLORS.map((color, i) => (
                  <div key={i} className={`qn-swatch ${selectedSwatchIndex === i ? 'selected' : ''}`} style={{background: color}} />
                ))}
              </div>
              <div className={`qn-save-btn ${isSaving ? 'saving' : ''}`}>
                保存 (CTRL+ENTER)
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{ color: '#1f2937', fontSize: '18px', fontWeight: 500, marginTop: '8px', padding: '0 24px' }}>
          在此开始书写...
        </div>
      )}
    </div>
  );
};
