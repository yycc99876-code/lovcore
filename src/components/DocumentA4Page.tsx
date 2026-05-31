import React, { useRef, useState, useEffect } from 'react';
import type { Item } from '../types';
import { useFileUrl, loadFile, storeFile, isFileRef, fileRefKey, storageCacheKey } from '../lib/fileStore';
import { renderPdfPages } from '../lib/documentExtraction';
import { isDocxItem, isPdfItem } from '../lib/itemTypeGuards';
import { downloadCardFile } from '../lib/cloudFileStore';

interface DocumentA4PageProps {
  item: Item;
  isCard?: boolean;
}

export const DocumentA4Page: React.FC<DocumentA4PageProps> = ({ item, isCard = false }) => {
  const isResume = item.id === '4-resume' && !item.originalFileRef && !item.previewPdfRef && !item.thumbnail;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState<number>(240);
  const resolvedThumbnail = useFileUrl(item.thumbnail, item.thumbnailStoragePath);
  const [thumbnailIsLandscape, setThumbnailIsLandscape] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [pagesLoading, setPagesLoading] = useState(false);

  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const [docxRendered, setDocxRendered] = useState(false);

  const [renderFailed, setRenderFailed] = useState(false);
  const isPresentation = ['ppt', 'pptx', 'odp'].includes(item.fileExtension?.toLowerCase() || '')
    || item.mimeType?.includes('powerpoint')
    || item.mimeType?.includes('presentation');

  useEffect(() => {
    setPageImages([]); // eslint-disable-line react-hooks/set-state-in-effect
    setPagesLoading(false);
    setRenderFailed(false);
    setDocxRendered(false);
    if (docxContainerRef.current) {
      docxContainerRef.current.innerHTML = '';
    }
  }, [item.id]);

  const loadOriginalFile = async (fallbackKey: string): Promise<Blob | null> => {
    if (item.originalFileRef && isFileRef(item.originalFileRef)) {
      const blob = await loadFile(fileRefKey(item.originalFileRef));
      if (blob) return blob;
    }

    if (item.originalStoragePath) {
      const result = await downloadCardFile(item.originalStoragePath);
      if (result.ok) {
        await storeFile(fallbackKey, result.blob).catch(() => {});
        return result.blob;
      }
    }

    return loadFile(fallbackKey);
  };

  const isPdfBlob = async (blob: Blob): Promise<boolean> => {
    if (blob.type === 'application/pdf') return true;
    const header = await blob.slice(0, 5).text().catch(() => '');
    return header === '%PDF-';
  };

  const loadPdfPreviewBlob = async (): Promise<Blob | null> => {
    const refCandidates = [item.previewPdfRef, item.originalFileRef].filter(Boolean);
    for (const ref of refCandidates) {
      if (!ref || !isFileRef(ref)) continue;
      const blob = await loadFile(fileRefKey(ref));
      if (blob && await isPdfBlob(blob)) return blob;
    }

    const keyCandidates = [
      item.id + '-preview-pdf',
      item.id + '-pdf',
      item.id + '-original',
    ];

    for (const key of keyCandidates) {
      const blob = await loadFile(key);
      if (blob && await isPdfBlob(blob)) return blob;
    }

    const cloudCandidates = [
      { path: item.previewPdfStoragePath, cacheKey: item.id + '-preview-pdf' },
      { path: item.originalStoragePath, cacheKey: item.id + '-pdf' },
    ];

    for (const candidate of cloudCandidates) {
      if (!candidate.path) continue;

      const cachedCloudBlob = await loadFile(storageCacheKey(candidate.path));
      if (cachedCloudBlob && await isPdfBlob(cachedCloudBlob)) return cachedCloudBlob;

      const result = await downloadCardFile(candidate.path);
      if (!result.ok) continue;
      if (await isPdfBlob(result.blob)) {
        await storeFile(storageCacheKey(candidate.path), result.blob).catch(() => {});
        await storeFile(candidate.cacheKey, result.blob).catch(() => {});
        return result.blob;
      }
    }

    return null;
  };

  // Render all PDF pages on demand when in detail mode
  useEffect(() => {
    if (isCard || isResume) return;
    if (pageImages.length > 0) return;

    const isPdf = isPdfItem(item);
    if (!isPdf) return;

    let cancelled = false;
    (async () => {
      setPagesLoading(true);
      const pdfBlob = await loadPdfPreviewBlob();
      if (cancelled) return;

      if (!pdfBlob) {
        setPagesLoading(false);
        setRenderFailed(true);
        return;
      }

      const file = new File([pdfBlob], item.title, { type: 'application/pdf' });
      const maxPages = Math.min(Math.max(item.pageCount || 20, 20), 80);
      const blobs = await renderPdfPages(file, maxPages, { trimWhitespace: isPresentation });
      if (cancelled) return;

      if (blobs.length > 0) {
        setPageImages(blobs.map((b) => URL.createObjectURL(b)));
      } else {
        setRenderFailed(true);
      }
      setPagesLoading(false);
    })();

    return () => { cancelled = true; };
  }, [isCard, isPresentation, isResume, item.id, item.originalFileRef, item.originalStoragePath, item.pageCount, item.previewPdfRef, item.previewPdfStoragePath, item.tags, item.title, item.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render docx with docx-preview in detail mode (Word-like rendering)
  useEffect(() => {
    if (isCard || isResume || docxRendered) return;

    const isDocx = isDocxItem(item);
    if (!isDocx || !docxContainerRef.current) return;

    let cancelled = false;
    (async () => {
      const blob = await loadOriginalFile(item.id + '-docx');
      if (!blob || cancelled) return;

      try {
        const { renderAsync } = await import('docx-preview');
        await renderAsync(blob, docxContainerRef.current!, undefined, {
          className: 'docx-word-render',
          inWrapper: true,
          breakPages: false,
          ignoreWidth: false,
          ignoreHeight: true,
          ignoreFonts: false,
          ignoreLastRenderedPageBreak: false,
          trimXmlDeclaration: true,
          renderHeaders: true,
          renderFooters: true,
        });
        if (!cancelled) setDocxRendered(true);
      } catch (err) {
        console.error('[DocumentA4Page] docx-preview error:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [isCard, isResume, item.id, item.originalFileRef, item.originalStoragePath, item.tags, item.title, docxRendered]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup blob URLs
  useEffect(() => {
    return () => { pageImages.forEach((u) => URL.revokeObjectURL(u)); };
  }, [pageImages]);

  useEffect(() => {
    if (!isCard) return;
    const element = containerRef.current;
    if (!element) return;

    // Set initial width
    setCardWidth(element.getBoundingClientRect().width || 240);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setCardWidth(entry.contentRect.width);
        }
      }
    });

    resizeObserver.observe(element);
    return () => {
      resizeObserver.disconnect();
    };
  }, [isCard]);

  // Helper to wrap the rendered A4 page in a scaling container if isCard is true
  const wrapPage = (content: React.ReactNode) => {
    if (!isCard) return content;
    const scale = cardWidth / 840;
    return (
      <div 
        className="document-card-page-wrapper" 
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative', 
          overflow: 'hidden', 
          backgroundColor: '#ffffff' 
        }}
      >
        <div 
          className="document-card-page-scaled"
          style={{
            width: '840px',
            height: '1188px',
            transformOrigin: 'top left',
            transform: `scale(${scale})`,
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'none'
          }}
        >
          {content}
        </div>
      </div>
    );
  };

  if (isResume) {
    return wrapPage(
      <div className={`document-a4-page resume-page ${!isCard ? 'is-full page-sheet shadow-effect' : ''}`}>
        <div className="resume-header">
          <div className="resume-header-left">
            <h1 className="resume-name">周国梁</h1>
            <p className="resume-contact">
              <span>150-7834-2178</span>
              <span className="dot-sep">|</span>
              <span>2055645842@qq.com</span>
              <span className="dot-sep">|</span>
              <span>成都大学 车辆工程 2026届本科</span>
            </p>
          </div>
          <div className="resume-photo-box">
            一寸照
          </div>
        </div>
        <div className="resume-divider"></div>

        {/* 核心技能 */}
        <div className="resume-section">
          <h2 className="resume-section-title">核心技能</h2>
          <ul className="resume-list">
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>Python开发与AI工程能力：</strong>熟练使用 <code>Python</code> 构建 AI 系统，熟悉 <code>Flask</code> / <code>FastAPI</code> 等 Web 框架，能快速开发 AI API 与后端服务。
              </span>
            </li>
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>LLM Agent与Workflow：</strong>深入实践 Multi-Agent 系统，熟练掌握意图识别、<code>Tool Calling</code>、任务编排与自动化流程 (<code>Dify</code> 实现 <code>LangChain</code>/<code>LangGraph</code> 核心能力)。
              </span>
            </li>
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>RAG知识库与Prompt Engineering：</strong>构建本地向量检索 + <code>RAG</code> 知识库，有效规避幻觉；擅长 <code>Prompt</code> 设计与迭代。
              </span>
            </li>
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>主流大模型与AIGC工具：</strong>系统掌握 <code>千问</code>、<code>Kimi</code>、<code>GLM</code>、<code>Claude</code>、<code>Grok</code>、<code>GPT</code> 等模型边界，以及 <code>Lovart</code>、<code>星流</code>、<code>GenSpark</code>、<code>Gamma</code> 等业务应用场景。
              </span>
            </li>
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>开源模型与前沿技术：</strong>对 <code>Qwen</code> 系列、<code>Gemma</code> 等开源模型的能力边界、调用及部署有实际理解，关注 <code>LoRA</code> / <code>Instruction Tuning</code> 等微调方法。
              </span>
            </li>
            <li>
              <span className="blue-bullet">•</span>
              <span>
                <strong>开发工具链：</strong><code>Cursor</code>、<code>Claude</code>、<code>Dify</code>、<code>OpenClaw</code>、<code>Codex</code> 等 AI 辅助开发工具使用熟练，并热爱学习新技术。
              </span>
            </li>
          </ul>
        </div>

        {/* 实习经历 */}
        <div className="resume-section">
          <h2 className="resume-section-title">实习经历</h2>
          <div className="resume-item">
            <div className="resume-item-header">
              <span className="company-role"><strong>帕西尼感知科技</strong> | 研究助理 (PPT可视化 / 项目申报方向)</span>
              <span className="date">2025.09 - 2026.03</span>
            </div>
            <ul className="resume-sublist">
              <li>
                <span className="blue-bullet">•</span>
                <span>负责项目申报材料撰写、商业计划书与 PPT 可视化制作，使用 <code>Gamma</code>、<code>即梦</code> 等 AI 工具，将复杂技术方案转化为高信息密度的材料。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>参与技术文档梳理与知识库建设，支持团队项目申报与外部展示需求。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>通过 AI 工具高效处理多模态内容，锻炼了将技术逻辑转化为清晰可视化表达的能力，可直接应用于智能光控制平台的策略生成与用户交互设计。</span>
              </li>
            </ul>
          </div>

          <div className="resume-item">
            <div className="resume-item-header">
              <span className="company-role"><strong>成都大运汽车</strong> | 质量与测试工程师 (实习)</span>
              <span className="date">2025.03 - 2025.05</span>
            </div>
            <ul className="resume-sublist">
              <li>
                <span className="blue-bullet">•</span>
                <span>深入汽车测试生产线，参与一线质量管控与数据自动化工作。跨部门对接研发、采购与车间，协助推动问题整改闭环，提升了一次检验合格率。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>使用 <code>Python</code> + <code>Excel VBA</code> 将现场质量数据自动生成周报与生命周期分析图表，替代了手工统计，显著提升统计效率。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>学习 <code>ISO 9001</code> 质量管理体系准则，辅助梳理部门日常工序规范 <code>SOP</code> 与检验基准书，累计追回 15,000 元。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>负责整车试装零件拆卸与 R&R 测量，主导偏差整改。主导偏差整改 3 份，亲自解决7起整车零件装配干涉与定位偏差。</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 项目经历 */}
        <div className="resume-section">
          <h2 className="resume-section-title">项目经历</h2>
          <div className="resume-item">
            <div className="resume-item-header">
              <span className="company-role"><strong>OutfitAI 智能试衣 SaaS 平台二期开发</strong> | 全栈开发 / AI 品牌落地</span>
              <span className="date">2026.02 - 至今</span>
            </div>
            <ul className="resume-sublist">
              <li>
                <span className="blue-bullet">•</span>
                <span>SaaS 平台二期开发（<code>React/TypeScript</code> + <code>Node.js</code> + <code>Python</code> + <code>Docker</code> + <code>Shell</code>），基于商用 SaaS 模板，高精细度还原交互设计、定位、AI 端匹配与接入及业务逻辑适配。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>基于 <code>Nest.js</code> 加 SaaS 模板进行业务细化改进、完成视频剪辑与视觉重构、用户空白站 of 自适应与重定向、优化产品信息表展示与导入导出模块。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>对接 <code>Stripe</code> 支付、内接订阅能力、内接订单管理、发票管理、变现列表与帐单配置等业务端完整流程，形成从支付到变现的完整闭环。</span>
              </li>
              <li>
                <span className="blue-bullet">•</span>
                <span>基于 <code>Supabase</code> 完成资产下载、口令登录与生成记录的持久化与存储，参与前端数据表设计，负责控制与业务端完整流程。</span>
              </li>
            </ul>
          </div>

          <div className="resume-item">
            <div className="resume-item-header">
              <span className="company-role"><strong>FSAR 实验室"空地协作"联控智能 Agent</strong> | 核心开发者 (<code>OpenClaw</code> 项目)</span>
              <span className="date">2026.02 - 至今</span>
            </div>
            <ul className="resume-sublist">
              <li>
                <span className="blue-bullet">•</span>
                <span>针对实验室智能联控需求，使用 <code>C++</code> 与 <code>ROS2</code> 构建控制链路与通信框架，打造专为多机任务规划、设备诊断与指令分发的端到端 <code>Agent</code> 架构。</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // General document display logic (e.g. for reports and other documents)
  const fileExt = item.title.split('.').pop()?.toUpperCase() || 'PDF';

  if (isCard) {
    if (resolvedThumbnail) {
      return (
        <div className={`document-a4-page has-cover ${isPresentation || thumbnailIsLandscape ? 'is-landscape' : ''}`}>
          <img
            src={resolvedThumbnail}
            alt={item.title}
            className="document-page-img"
            onLoad={(event) => {
              const image = event.currentTarget;
              setThumbnailIsLandscape(image.naturalWidth > image.naturalHeight * 1.15);
            }}
          />
        </div>
      );
    }

    const displayText = item.content || item.summary || '';
    const contentParagraphs = displayText
      .split(/\n{2,}/)
      .map(p => p.replace(/\n/g, ' ').trim())
      .filter(p => p.length > 0)
      .slice(0, 8);

    return wrapPage(
      <div className="document-a4-page generic-text-page">
        <div className="generic-page-header">
          <span className="generic-doc-type">{fileExt}</span>
          <span className="generic-doc-mark">LOVCORE ARCHIVE</span>
        </div>
        <div className="generic-page-body">
          <h2 className="generic-page-title">{item.title.replace(/\.[^/.]+$/, '')}</h2>
          <div className="generic-page-divider"></div>
          {contentParagraphs.length > 0 ? (
            <div className="generic-page-content">
              {contentParagraphs.map((para, i) => (
                <p key={i} className="generic-page-paragraph">{para}</p>
              ))}
            </div>
          ) : (
            <p className="generic-page-summary">Document content will appear here after processing.</p>
          )}
        </div>
        <div className="generic-page-footer">
          <span>PAGE 1</span>
        </div>
      </div>
    );
  }

  // Full detail mode: document reader with rendered pages
  const detailContent = item.content || '';
  const detailParagraphs = detailContent
    .split(/\n{2,}/)
    .map(p => p.replace(/\n/g, ' ').trim())
    .filter(p => p.length > 0);

  const isPdf = isPdfItem(item);

  // PDF: always show rendered page images, never fall through to text
  if (isPdf) {
    if (pageImages.length > 0) {
      return (
        <div className="document-viewer-pages">
          {pageImages.map((url, i) => (
            <div key={i} className={`document-a4-page page-sheet shadow-effect document-rendered-page ${isPresentation ? 'is-landscape' : ''}`}>
              <img src={url} alt={`Page ${i + 1}`} className="document-rendered-page-img" />
              <div className="page-number-indicator">Page {i + 1}</div>
            </div>
          ))}
        </div>
      );
    }

    // Still loading
    if (pagesLoading) {
      return (
        <div className="document-viewer-pages">
          <div className={`document-a4-page page-sheet shadow-effect document-rendered-page ${isPresentation ? 'is-landscape' : ''}`}>
            <div className="document-loading-indicator">
              <span>Rendering pages...</span>
            </div>
          </div>
        </div>
      );
    }

    // Render failed (no blob or pdfjs error)
    if (renderFailed) {
      return (
        <div className="document-viewer-pages">
          <div className={`document-a4-page page-sheet shadow-effect document-rendered-page ${isPresentation ? 'is-landscape' : ''}`}>
            {resolvedThumbnail ? (
              <>
                <img src={resolvedThumbnail} alt={`${item.title} preview`} className="document-rendered-page-img" />
                <div className="page-number-indicator">Preview</div>
              </>
            ) : (
              <div className="document-loading-indicator">
                <span style={{ color: '#999', fontSize: '13px' }}>Unable to render original PDF pages.</span>
                <span style={{ color: '#bbb', fontSize: '11px', marginTop: '8px', display: 'block' }}>The original file may have been lost. Try re-uploading.</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback loading state (should not normally reach here)
    return (
      <div className="document-viewer-pages">
        <div className={`document-a4-page page-sheet shadow-effect document-rendered-page ${isPresentation ? 'is-landscape' : ''}`}>
          <div className="document-loading-indicator">
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // DOCX: Word-like rendering via docx-preview
  const isDocx = isDocxItem(item);

  if (isDocx) {
    return (
      <div className="document-viewer-pages docx-word-viewer">
        <div ref={docxContainerRef} className="docx-word-container" />
        {!docxRendered && (
          <div className="document-a4-page page-sheet shadow-effect document-rendered-page">
            <div className="document-loading-indicator">
              <span>Loading document...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // TXT / MD / legacy DOC / other: clean continuous text reader.
  // Legacy .doc cannot be faithfully rendered in-browser without a converter,
  // so keep it readable and never clip it inside a fake fixed-height A4 page.
  return (
    <div className="document-viewer-pages">
      <div className="document-text-reader-page page-sheet shadow-effect">
        <h2 className="detail-doc-title">{item.title.replace(/\.[^/.]+$/, '')}</h2>
        <div className="detail-doc-divider"></div>
        {item.summary && (
          <p className="detail-doc-summary">{item.summary}</p>
        )}
        <div className="detail-doc-content">
          {detailParagraphs.map((para, i) => (
            <p key={i} className="detail-doc-paragraph">{para}</p>
          ))}
        </div>
      </div>
    </div>
  );
};

