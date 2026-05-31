import type { Item } from './types';

export const mockItems: Item[] = [
  {
    id: '1',
    type: 'video',
    title: 'This is AGI: Sequoia AI Ascent 2026 Keynote',
    sourceUrl: 'https://www.youtube.com/watch?v=LRo33rnv6rQ',
    duration: '22:15',
    thumbnail: '/images/sequoia_agi_screenshot.png',
    content: 'Sequoia Capital keynote on the AGI threshold in 2026. Arguing that long-horizon agents make agentic workflows ready for enterprise builders. Key topics: reasoning limits, computational costs, system-2 thinking, real economic output.',
    summary: 'A Sequoia keynote arguing that long-horizon agents make 2026 a practical AGI threshold for business builders.',
    keyClaims: [
      'Agentic workflows have crossed the threshold of economic viability.',
      'System-2 reasoning at test-time is replacing static model scale.',
      'The value of AI is shifting from software seat-licensing to selling completed services.'
    ],
    whyItMatters: 'This should be Lovcore\'s canonical example of saving a business technology video and turning it into searchable thesis cards.',
    tags: ['ai', 'agi', 'agents', 'sequoia', 'keynote', 'business-model'],
    status: 'ready',
    createdAt: '2026-05-22T09:00:00Z'
  },
  {
    id: '2',
    type: 'article',
    title: 'Services: The New Software',
    sourceUrl: 'https://sequoiacap.com/article/services-the-new-software/',
    content: 'In the software era, vendors sold tools (SaaS) for employees to use. In the agentic era, vendors sell completed services (work) accomplished by AI autopilots. This shifts the target market from the IT budget ($400B SaaS market) to the global labor budget ($10T+). Software companies will price by outcome, not seats. The core constraint becomes compute efficiency rather than seat density.',
    summary: 'Sequoia\'s thesis that AI-native companies can sell completed work instead of software tools.',
    keyClaims: [
      'The $400B SaaS market is expanding into a $10T global labor market.',
      'AI allows companies to sell completed work (services) instead of software seats.',
      'Pricing models will shift from per-seat subscriptions to performance/outcome metrics.'
    ],
    whyItMatters: 'Useful for defining Lovcore\'s future as a tool that converts saved knowledge into executable work.',
    tags: ['ai', 'services', 'software', 'sequoia', 'autopilot', 'venture-thesis'],
    status: 'ready',
    createdAt: '2026-05-22T08:30:00Z'
  },
  {
    id: '3',
    type: 'link',
    title: 'Claude Code by Anthropic',
    sourceUrl: 'https://www.anthropic.com/product/claude-code',
    thumbnail: '/images/claude_code_screenshot.png',
    content: 'Claude Code is an agentic coding tool that runs in the developer terminal. It reads, writes, and tests code directly, executing commands and editing files locally under developer supervision.',
    summary: 'Anthropic\'s agentic coding product page, presenting software development as goal description plus agent execution.',
    keyClaims: [
      'State-of-the-art terminal agent for developers.',
      'Seamless tool usage (file edit, shell execute, git commit, grep search) directly in local environments.',
      'Transition from autocomplete copilot to goal-driven autonomous assistant.'
    ],
    whyItMatters: 'Useful for Lovcore\'s future dev-prompt generation and saved product page analysis.',
    tags: ['anthropic', 'claude-code', 'agentic-coding', 'software-3', 'product'],
    status: 'ready',
    createdAt: '2026-05-22T08:00:00Z'
  },
  {
    id: '4',
    type: 'pdf',
    title: '2026 AI Index Report.pdf',
    fileSize: '14.2 MB',
    pageCount: 482,
    thumbnail: '/images/ai_index_cover.png',
    content: 'Stanford HAI 2026 AI Index Report. A comprehensive data-driven review of foundation models, global investment patterns, legislative responses, capability benchmarks, and industry workforce adoption.',
    summary: 'A macro report on AI progress, industry adoption, investment, policy, and model capabilities.',
    keyClaims: [
      'Global AI venture funding reached record highs in 2025, driven by agentic startups.',
      'Frontier models show diminishing returns in raw pre-training benchmarks but major gains in reasoning APIs.',
      'Enterprise adoption of multi-agent orchestration systems increased by 140% year-over-year.'
    ],
    whyItMatters: 'Represents serious PDF/research archive usage.',
    tags: ['stanford', 'ai-index', 'report', 'research', 'policy'],
    status: 'ready',
    createdAt: '2026-05-22T07:15:00Z'
  },
  {
    id: '4-resume',
    type: 'pdf',
    title: '周国梁 - 车辆工程专业本科.pdf',
    fileSize: '0.4 MB',
    pageCount: 1,
    content: '周国梁的个人简历。成都大学车辆工程2026届本科。核心技能包含Python开发与AI工程能力、LLM Agent与Workflow工作流、RAG知识库与Prompt Engineering、主流大模型与AIGC工具、开源模型与前沿技术微调等。实习经历包括帕西尼感知科技（研究助理）、成都大运汽车（质量与测试工程实习），全栈与Agent项目开发。',
    summary: '成都大学车辆工程2026届本科生，具备Python开发、AI工程、LLM Agent系统、RAG知识库等核心技能。拥有帕西尼感知科技研究助理与大运汽车质量测试实习经历，主导过多款 SaaS 平台与 ROS2 联控 Agent 研发。',
    keyClaims: [
      '熟练掌握 Python、C++、ROS2 及 React/TypeScript 全栈开发，具备丰富的大模型 Agent 架构设计与工作流编排经验。',
      '在帕西尼感知科技与成都大运汽车有深度实习经验，曾通过 Python 与 VBA 提升数据自动化分析效率。',
      '主导 OutfitAI 智能试衣 SaaS 平台二期全栈开发（Stripe 支付、订阅等）与 FSAR 实验室 ROS2 空地协作联控 Agent 核心研发。'
    ],
    whyItMatters: '具备突出的全栈与 Agent 系统开发能力，结合扎实的工程实践，是 Lovcore 团队亟需的复合型技术人才。',
    tags: ['Document', '多模态AI', 'Prompt Engineering', '质量工程', 'SaaS平台', '全栈开发', 'RAG知识库', 'LLM Agent', 'AI工程'],
    status: 'ready',
    createdAt: '2026-05-22T07:10:00Z'
  },
  {
    id: '5',
    type: 'link',
    title: 'AI + a16z',
    sourceUrl: 'https://a16z.com/ai/',
    thumbnail: '/images/a16z_screenshot.png',
    content: 'Andreessen Horowitz (a16z) artificial intelligence ecosystem hub. A curated library of venture partner essays, infrastructure stack guides, and developer podcasts discussing agent capabilities and computational hardware scales.',
    summary: 'A hub of AI essays, open-source projects, podcasts, and market perspectives from a16z.',
    keyClaims: [
      'The AI stack is stabilizing around unified runtime orchestrators.',
      'Context-window expansion changes database architectures.',
      'Sovereign AI clouds are emerging as a major infrastructure tier.'
    ],
    whyItMatters: 'Good benchmark for article/link cards and topic filtering.',
    tags: ['ai', 'a16z', 'research', 'venture', 'podcast'],
    status: 'ready',
    createdAt: '2026-05-22T06:40:00Z'
  },
  {
    id: '6',
    type: 'note',
    title: 'Lovcore positioning',
    content: 'Lovcore should feel like mymind for AI business intelligence: save anything, organize nothing, search by memory, and later turn saved sources into briefs for agents.',
    summary: 'A positioning note for Lovcore as a private AI/business memory archive.',
    keyClaims: [
      'Focus on frictionless collection of premium tech signals.',
      'Zero cognitive overhead for user categorization.',
      'Bridge between human knowledge intake and agentic execution workflows.'
    ],
    whyItMatters: 'A realistic founder note that should look beautiful as a private thought card.',
    tags: ['lovcore', 'positioning', 'memory', 'private-archive', 'product-thinking'],
    noteBgColor: 'rgba(238, 233, 224, 0.65)',
    status: 'ready',
    createdAt: '2026-05-22T06:10:00Z'
  },
  {
    id: '7',
    type: 'link',
    title: 'Sequoia AI Ascent 2026 Hub',
    sourceUrl: 'https://sequoiacap.com/article/ai-ascent-2026/',
    thumbnail: '/images/founder_desk.png',
    content: 'The central hub for Sequoia\'s annual AI summit, containing panel discussions on compute infrastructure, applications as services, agent safety, and interviews with foundational model founders.',
    summary: 'Keynote and summit hub gathering video transcripts, presentation slides, and venture summaries from AI Ascent 2026.',
    keyClaims: [
      'Computational training constraints are leading builders to optimize inference-time compute.',
      'Enterprise deployments are moving from pilot chat interfaces to background autonomous agents.',
      'Founders emphasize developer ergonomics and local-first execution tools.'
    ],
    whyItMatters: 'Reference link for tracking Sequoia\'s portfolio founders and infrastructure opinions.',
    tags: ['ai', 'keynote', 'sequoia', 'summit', 'venture', 'infrastructure'],
    status: 'ready',
    createdAt: '2026-05-21T18:20:00Z'
  },
  {
    id: '8',
    type: 'article',
    title: 'OpenAI: The Next Phase of Enterprise AI',
    sourceUrl: 'https://openai.com/index/next-phase-of-enterprise-ai/',
    content: 'As companies move beyond early chat interface pilots, the next phase of enterprise AI focuses on deeply integrated custom workflows. Companies are connecting foundation models to internal databases, letting agents read legacy records, plan scheduled tasks, and perform back-office reconciliation automatically. This is driving a shift from ad-hoc usage to systematic API consumption.',
    summary: 'An overview of enterprise adoption shifts from pilot chatbots to integrated agentic workflow runtimes.',
    keyClaims: [
      'Chat interfaces are a bridge; the true target is automated, background tasks.',
      'Retrieval Augmented Generation (RAG) is maturing into automated data plane indexing.',
      'Security, data provenance, and deterministic execution remain the primary enterprise bottlenecks.'
    ],
    whyItMatters: 'Useful context for predicting model demand patterns and enterprise budget allocations.',
    tags: ['openai', 'enterprise-ai', 'agentic-workflow', 'adoption', 'business-model'],
    status: 'ready',
    createdAt: '2026-05-21T14:40:00Z'
  },
  {
    id: '9',
    type: 'video',
    title: 'NVIDIA GTC 2026 Keynote',
    sourceUrl: 'https://www.nvidia.com/gtc/keynote/',
    duration: '120:00',
    thumbnail: '/images/computation_node.png',
    content: 'Jensen Huang outlines NVIDIA\'s roadmap for Blackwell chips, physical AI agent systems, and sovereign computing clouds. Highlights the integration of AI models with industrial simulation platforms (Omniverse).',
    summary: 'NVIDIA\'s 2026 developer keynote outlining Blackwell deployments, physical robotics training, and global datacenter grids.',
    keyClaims: [
      'Data centers are transitioning from general-purpose compute to generative AI factories.',
      'Physical AI (robotics and industrial simulation) represents the next frontier of model application.',
      'Hardware scaling continues through multi-node GPU clustering and high-bandwidth optical interconnects.'
    ],
    whyItMatters: 'Core infrastructure roadmap reference for tracking silicon capacity constraints.',
    tags: ['nvidia', 'infrastructure', 'keynote', 'hardware', 'gpu', 'robotics'],
    status: 'ready',
    createdAt: '2026-05-21T10:15:00Z'
  },
  {
    id: '10',
    type: 'pdf',
    title: '2026 Agentic Coding Trends Report.pdf',
    fileSize: '8.7 MB',
    pageCount: 84,
    thumbnail: '/images/agentic_coding_report_cover.png',
    content: 'Anthropic research paper investigating how software development teams adopt terminal and editor agents. Details changes in velocity, code-review overhead, and the emergence of "description-first" programming practices.',
    summary: 'Anthropic\'s research on agentic coding, multi-agent workflows, developer orchestration, and organizational adoption.',
    keyClaims: [
      'Developer velocity increases by 60% for standard debugging and refactoring tasks.',
      'Code review processes are shifting to focus on intent validation rather than line-by-line syntax checks.',
      'High-context terminal interfaces show higher success rates in complex refactoring than sidebar chats.'
    ],
    whyItMatters: 'Key research reference supporting Lovcore\'s agentic developer integrations.',
    tags: ['anthropic', 'report', 'agentic-coding', 'software-3', 'research'],
    status: 'ready',
    createdAt: '2026-05-20T16:50:00Z'
  },
  {
    id: '11',
    type: 'article',
    title: 'OpenAI: A Business That Scales With The Value Of Intelligence',
    sourceUrl: 'https://openai.com/index/a-business-that-scales-with-the-value-of-intelligence/',
    content: 'The economics of foundation models differ fundamentally from SaaS. Instead of flat hosting costs, model providers face compute expenses that scale directly with the depth of thinking (inference-time reasoning). As models perform more complex System-2 searches before returning answers, the cost structure transitions from volume-based to value-based pricing.',
    summary: 'Analysis of the economic shifts in AI businesses, detailing compute budgets and the value scaling of intelligence.',
    keyClaims: [
      'Model pricing will evolve to reflect the cognitive value of the output rather than simple token counts.',
      'Inference-time search is becoming the dominant driver of compute demand.',
      'The marginal cost of intelligence continues to fall, enabling high-frequency agent interactions.'
    ],
    whyItMatters: 'Venture economics model for computing businesses.',
    tags: ['openai', 'economics', 'compute', 'inference', 'business-model'],
    status: 'ready',
    createdAt: '2026-05-20T11:20:00Z'
  },
  {
    id: '12',
    type: 'image',
    title: 'AI Logic & Reasoning Prism',
    content: 'A conceptual photograph of an obsidian prism refracting a single beam of coherent light. Captures the transition from chaotic inputs to structured logical output, symbolizing inference-time reasoning architectures (System-2).',
    summary: 'A visual metaphor representing high-context reasoning and search models refracting complex logic in enterprise intelligence systems.',
    thumbnail: '/images/reasoning_prism.png',
    colorPalette: ['#0A0A0A', '#FFFFFF', '#7A7A7A', '#3C3C3C'],
    keyClaims: [
      'Visual clarity represents the goal of alignment and reasoning algorithms.',
      'System-2 inference search is modeled as high-density refraction of text tokens.'
    ],
    whyItMatters: 'Reference for representing abstract computing concepts with highly refined, non-literal imagery.',
    tags: ['reasoning', 'prism', 'concept', 'system-2', 'alignment'],
    status: 'ready',
    createdAt: '2026-05-20T09:10:00Z'
  },
  {
    id: '13',
    type: 'image',
    title: 'Silicon Microprocessor Macro',
    content: 'High-resolution macro photograph of a 3nm silicon wafer under clean room lighting. Illustrates the dense geometric pathways and circuit arrays that underpin high-performance compute clusters.',
    summary: 'Macro view of silicon microprocessor circuitry, highlighting the physical infrastructure limits of modern foundation model training.',
    thumbnail: '/images/silicon_macro.png',
    colorPalette: ['#1A1C1D', '#5E6670', '#C2C8D1', '#8C775E'],
    keyClaims: [
      'Silicon scaling faces physical thermal and power density limits.',
      'High-density packaging (CoWoS) is critical to modern accelerator architectures.'
    ],
    whyItMatters: 'Visual reference for raw compute hardware density.',
    tags: ['hardware', 'silicon', 'chip', 'infrastructure', 'compute'],
    status: 'ready',
    createdAt: '2026-05-19T15:45:00Z'
  },
  {
    id: '14',
    type: 'note',
    title: 'Venture Thesis: Outcome-Based Pricing vs SaaS Seat-Licensing',
    content: 'Traditional SaaS charges a subscription fee per employee seat, assuming human productivity is the value unit. When an AI agent performs 100% of the task (e.g. drafting customer support, resolving code, filing records), charging for seats makes no sense. The business must pivot to charging per outcome (e.g., $2 per resolved support ticket, $5 per successfully debugged issue). This aligns incentives directly with productivity.',
    summary: 'Venture investment notes on the shift from seat-based pricing to outcome-based metrics in agentic enterprise software.',
    keyClaims: [
      'The per-seat pricing model is broken in an autonomous agent economy.',
      'Outcome-based pricing forces startups to guarantee quality metrics.',
      'Customer procurement departments must reorganize to buy tasks rather than licenses.'
    ],
    whyItMatters: 'Investment thesis outlining the business model shift for Lovcore portfolio planning.',
    tags: ['venture-thesis', 'saas', 'pricing-model', 'business-model', 'finance'],
    noteBgColor: 'rgba(230, 226, 218, 0.65)',
    status: 'ready',
    createdAt: '2026-05-19T11:00:00Z'
  },
  {
    id: '15',
    type: 'link',
    title: 'Conviction AI',
    sourceUrl: 'https://www.conviction.com/',
    thumbnail: '/images/conviction_screenshot.png',
    content: 'Conviction is a venture capital firm founded by Sarah Guo, backing "Software 3.0" and AI-native startups. The fund is built around the thesis that foundation models change the stack, the interface, and the capabilities of enterprise software.',
    summary: 'Minimalist portfolio landing page of Conviction, an early-stage venture fund focused on Software 3.0.',
    keyClaims: [
      'The stack is rebuilding from the database up around model capability.',
      'AI investments require highly technical, founder-first diligence.'
    ],
    whyItMatters: 'Useful benchmark for visual minimalism and venture portfolio presentation.',
    tags: ['venture', 'conviction', 'software-3', 'portfolio', 'investment'],
    status: 'ready',
    createdAt: '2026-05-18T14:30:00Z'
  },

  {
    id: '17',
    type: 'note',
    title: 'Multi-Agent Swarm Sync Protocol',
    content: 'Technical design scratchpad for swarm memory sync:\n\n1. State sync must be asynchronous and event-driven to avoid blocking execution threads.\n2. Use vector indexes for long-term memory retrieval, and short-term append-only lists for immediate session context.\n3. Implement token pruning heuristics to prevent context bloat during long-horizon tasks.\n4. Ensure deterministic fallbacks when agents run into rate limits or reasoning loops.',
    summary: 'Technical notes on multi-agent swarm state synchronization, memory indexing, and token budget management.',
    keyClaims: [
      'Asynchronous state synchronization is mandatory for responsive agent grids.',
      'Token pruning heuristics are key to sustaining context window margins.'
    ],
    whyItMatters: 'Reference note for engineering Lovcore\'s future multi-agent workspace pipelines.',
    tags: ['multi-agent', 'protocol', 'software-engineering', 'memory-sync', 'notes'],
    noteBgColor: 'rgba(220, 226, 222, 0.65)',
    status: 'ready',
    createdAt: '2026-05-17T16:10:00Z'
  },
  {
    id: '18',
    type: 'pdf',
    title: 'The State of Foundation Models Q1 2026.pdf',
    fileSize: '6.4 MB',
    pageCount: 92,
    content: 'Frontier model capability analysis for Q1 2026. Evaluating context window pricing, reasoning latency, agentic reliability scores, tool-use speed, and the open-source vs proprietary performance delta.',
    summary: 'A quarterly analyst brief tracking frontier model metrics, context cost structures, and agent tool-use accuracy.',
    keyClaims: [
      'Inference-time search models have achieved a 5x cost reduction since last quarter.',
      'Context window prices for proprietary models dropped by 45%, intensifying competition with open-source options.',
      'Agentic tool usage reliability reached 96% in standard file operations.'
    ],
    whyItMatters: 'Quarterly research backing model selection decisions for developer projects.',
    tags: ['pdf', 'foundation-models', 'research', 'cost-analysis', 'performance'],
    status: 'ready',
    createdAt: '2026-05-17T11:30:00Z'
  },

  {
    id: '20',
    type: 'image',
    title: 'Multi-Agent Swarm Architecture Blueprint',
    content: 'A high-end technical design notebook showing multi-agent system state diagrams, loop sync logic, and message queues hand-drawn with fine white pencil on textured dark charcoal grey paper. Details the state synchronization protocol between parallel context nodes.',
    summary: 'Hand-drawn multi-agent system flowchart on textured dark charcoal paper, representing software architectures for parallel execution grids.',
    thumbnail: '/images/agentic_flow_sketch.png',
    colorPalette: ['#171718', '#6A6C6D', '#C4C6C7', '#343536'],
    keyClaims: [
      'Visualizing swarm protocols as finite state machines helps debug edge races.',
      'Hand-sketched logic mappings reduce early planning biases in high-context execution layers.'
    ],
    whyItMatters: 'Serves as the visual blueprint for Lovcore\'s upcoming asynchronous agent syncing engine.',
    tags: ['multi-agent', 'architecture', 'blueprint', 'software-3', 'design'],
    status: 'ready',
    createdAt: '2026-05-15T16:10:00Z'
  }
];
