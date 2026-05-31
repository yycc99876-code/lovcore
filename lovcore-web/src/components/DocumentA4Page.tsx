'use client';

import React, { useRef, useState, useEffect } from 'react';
import type { Item } from '../types';
import { useFileUrl } from '../lib/fileStore';

interface DocumentA4PageProps {
  item: Item;
  isCard?: boolean;
}

export const DocumentA4Page: React.FC<DocumentA4PageProps> = ({ item, isCard = false }) => {
  const isResume = item.id === '4-resume' || item.title.includes('周国梁');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cardWidth, setCardWidth] = useState<number>(240);
  const resolvedThumbnail = useFileUrl(item.thumbnail);

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
              <span className="company-role"><strong>FSAR 实验室“空地协作”联控智能 Agent</strong> | 核心开发者 (<code>OpenClaw</code> 项目)</span>
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
        <div className="document-a4-page has-cover">
          <img src={resolvedThumbnail} alt={item.title} className="document-page-img" />
        </div>
      );
    }

    return wrapPage(
      <div className="document-a4-page generic-text-page">
        <div className="generic-page-header">
          <span className="generic-doc-type">{fileExt}</span>
          <span className="generic-doc-mark">LOVCORE ARCHIVE</span>
        </div>
        <div className="generic-page-body">
          <h2 className="generic-page-title">{item.title}</h2>
          <div className="generic-page-divider"></div>
          <p className="generic-page-summary">{item.summary || item.content}</p>
          <div className="generic-skeleton-lines">
            <div className="skeleton-line"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
        <div className="generic-page-footer">
          <span>PAGE 1</span>
        </div>
      </div>
    );
  }

  // Full detail mode: Multi-page document viewer!
  return (
    <div className="document-viewer-pages">
      {resolvedThumbnail && (
        <div className="document-a4-page has-cover page-sheet shadow-effect">
          <img src={resolvedThumbnail} alt={item.title} className="document-page-img" />
          <div className="page-number-indicator">Page 1</div>
        </div>
      )}
      <div className="document-a4-page generic-text-page page-sheet shadow-effect">
        <div className="generic-page-header">
          <span className="generic-doc-type">{fileExt}</span>
          <span className="generic-doc-mark">LOVCORE ANALYST MEMO</span>
        </div>
        <div className="generic-page-body">
          <h2 className="generic-page-title">{item.title}</h2>
          <div className="generic-page-divider"></div>
          
          <div className="memo-section">
            <h3>Analyst Brief</h3>
            <p className="memo-paragraph">{item.summary || item.content || 'Content extraction complete. Lovcore has indexed the structure and context of this document.'}</p>
          </div>

          {item.keyClaims && item.keyClaims.length > 0 && (
            <div className="memo-section">
              <h3>Core Thesis & Claims</h3>
              <ul className="memo-list">
                {item.keyClaims.map((claim, idx) => (
                  <li key={idx}>
                    <span className="bullet-indicator">•</span>
                    {claim}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.whyItMatters && (
            <div className="memo-section">
              <h3>Venture Outlook</h3>
              <p className="memo-paragraph"><em>“{item.whyItMatters}”</em></p>
            </div>
          )}
        </div>
        <div className="generic-page-footer">
          <span>Page {resolvedThumbnail ? '2' : '1'}</span>
        </div>
      </div>
    </div>
  );
};

