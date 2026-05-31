import type en from './en';

const zh: typeof en = {
  // === Landing Page ===
  landing: {
    tagline: '私 人 灵 感 库',
    heroTitle: '记住，',
    heroTitleItalic: '不费力气。',
    heroDesc: 'Lovcore 是一个安静的本地灵感库，用视觉 AI 无缝整理你的想法、书签、笔记、图片和文档。',
    passwordPlaceholder: '输入安全密钥…',
    enterBtn: '进入',
    emailPlaceholder: '邮箱',
    signUpBtn: '注册',
    switchToSignIn: '已有账号？登录',
    switchToSignUp: '没有账号？注册',
    googleAuth: '使用 Google 登录',
    inputHelper: '悬停查看你的素描伙伴。输入任意内容即可进入。',
    companionLabel: '档案馆守护者',
    mascotHint: '猫咪会追随你的光标。拖入文件即可归档。',
    exploreFeatures: '探索功能',
    featuresTitle: '整理思绪，',
    featuresTitleItalic: '如同遗忘般轻松。',
    feature1Title: '随手拖放',
    feature1Desc: '图片、PDF、文章、笔记或链接，直接拖到屏幕上。无需分类，无需标签，放下就好。',
    feature2Title: '智能标签',
    feature2Desc: '视觉与文本模型自动分析内容，提取主色调，提炼核心文本，打上语义标签。',
    feature3Title: '完全私密',
    feature3Desc: 'Lovcore 在你的浏览器中本地运行。你的想法、截图和灵感属于你，只留在你的设备上。',
    dragDropTitle: '释放文件，收录灵感',
    dragDropSubtitle: '你的守护猫咪正等着接住它！',
    footer: '安静地整理你的思绪。',
    sandboxTitle: '实时收录预览（沙盒）',
    ingesting: '正在收录',
    aiAnalyzing: 'Lovcore AI 分析中…',
    aiExtracted: '视觉 AI 提取出设计语义，构图在自然手绘元素间达成平衡。',
    aiDocParsed: '文档解析器已索引标题与引用，来源：',
    aiTextCaptured: '已提取文本内容并索引至本地安全节点。',
  },

  // === Search Header ===
  header: {
    theStack: '灵感栈',
    folios: '收藏集',
    echoes: '回响',
    searchPlaceholder: '搜索我的记忆…',
    allFilter: '全部',
    images: '图片',
    documents: '文档',
    notes: '笔记',
    videos: '视频',
    articles: '文章',
    links: '链接',
    allFolios: '全部收藏集',
    themeLight: '切换至宣纸模式（亮色）',
    themeDark: '切换至黑曜石模式（暗色）',
    lockVault: '锁定灵感库并退出',
  },

  // === Content Card ===
  card: {
    analyzingSteps: [
      '温柔地收录中…',
      '观察视觉平衡…',
      '阅读细微之处…',
      '编织记忆连接…',
      '提取色彩基因…',
      '归入你的档案馆…',
    ],
    archivingNew: '正在收录新灵感…',
    deleteTitle: '永久删除',
    pages: '页',
  },

  // === Detail Drawer ===
  drawer: {
    escToClose: '按 ESC 关闭',
    downloadPdf: '下载 PDF',
    openBookmark: '打开书签',
    articleMode: '阅读模式',
    startTyping: '在这里写下你的想法…',
    saving: '保存中…',
    saved: '已保存',
    editTitle: '点击编辑标题',
    analystBrief: 'AI 洞察',
    aiFormulating: 'AI 正在建立记忆连接…',
    coreThesis: '核心论点',
    ventureOutlook: '趋势展望',
    colorDna: '色彩基因',
    exportOptions: '导出',
    copyMarkdown: '复制 Markdown',
    copyPlainText: '复制纯文本',
    markdownFile: 'Markdown (.md)',
    textFile: '文本 (.txt)',
    htmlFile: 'HTML (.html)',
    wordFile: 'Word (.doc)',
    printPdf: '打印 PDF',
    associatedTags: '关联标签',
    tagPlaceholder: '+ 标签',
    archiveCatalog: '归档信息',
    acquired: '收录时间',
    source: '来源',
    format: '格式',
    size: '大小',
    pages: '页数',
    fileDownloaded: '文件已下载',
    copiedMarkdown: '已复制 Markdown！',
    copiedPlainText: '已复制纯文本！',
    pdfPrintOpened: 'PDF 打印窗口已打开',
    couldNotGeneratePdf: '无法生成 PDF 打印器',
  },

  // === Spaces View ===
  spaces: {
    allFolios: '全部收藏集',
    createNew: '创建新收藏集',
    cards: '张卡片',
  },

  // === Create Space Modal ===
  createSpace: {
    title: '创建新收藏集',
    desc: '收藏集是你脑海中的一组卡片集合。可以直接上传到收藏集中，也可以从总览里挑选。',
    namePlaceholder: '为收藏集命名',
    nextStep: '下一步',
    smartFolioLink: '想创建智能收藏集？',
    pickColor: '选择颜色',
    colorDesc: '为收藏集配上颜色，需要时一眼就能找到它。',
    finishSave: '完成并保存',
  },

  // === Serendipity View ===
  serendipity: {
    eyebrow: '拥抱回响',
    introTitle: '今天，偶然会给你看什么？',
    introDesc: '在思绪中快速漫游，唤醒并强化你的记忆。',
    showMe: '开始探索',
    emptyTitle: '此刻，思绪静谧。',
    emptyDesc: '先保存几张卡片，再开启回响之旅。',
    soundscape: '氛围音景',
    muteAmbient: '静音氛围音',
    playAmbient: '播放冥想氛围音',
    keep: '保留',
    forget: '遗忘',
    keepBtn: '保留',
    forgetBtn: '遗忘',
  },

  // === Quick Note Card ===
  quickNote: {
    newNote: '新建速记',
    startTyping: '在此开始书写…',
    save: '保存 (Ctrl+Enter)',
    expand: '展开',
    collapse: '收起',
    close: '关闭',
  },

  // === Drag Zone ===
  dragZone: {
    title: '释放，收录进你的记忆。',
    subtitle: '拖入图片、PDF、文章或文本文件，归档至 Lovcore',
  },

  // === Ghost Overlay ===
  ghost: {
    replaceWith: '替换为',
    scanning: '扫描中…',
    tabAccept: 'Tab',
    acceptCompletion: '接受补全',
    acceptCorrection: '接受修改',
  },

  // === Voice Recorder ===
  voice: {
    handsfree: '免提模式',
    recording: '录音中',
    instruction: '（指令）',
    stopHintHandsfree: 'Ctrl+Insert 或 Esc 停止',
    stopHintRecording: '松开 Insert 停止',
    transcribing: '转写中…',
    dismissHint: 'Esc 关闭',
    rewritePreview: 'AI 重写预览',
    apply: '应用 (Enter)',
    cancel: '取消 (Esc)',
  },

  // === Editor ===
  editor: {
    placeholder: '输入 / 唤出快捷命令',
  },

  // === Inline AI Command ===
  inlineAI: {
    customEdit: '自定义修改',
    close: '关闭',
    howToEdit: '你希望如何修改这段内容？',
    presets: ['更自然', '更简洁', '更像产品经理写的', '更有说服力'],
    placeholder: '例如：让表达更自然，但保留原本观点',
    voiceHint: 'Insert 语音 / Ctrl+Insert 免提 / Ctrl+Enter 生成',
    generate: '生成修改',
    editing: '编辑中…',
    failed: '失败 · 按 Esc 关闭',
    accept: '接受',
    reject: '拒绝',
  },

  // === App / Toasts ===
  app: {
    noSearchResults: '没有找到匹配的档案',
    noSearchHint: '试试调整搜索词，或选择其他类型过滤器。',
    emptyTitle: '此刻，思绪静谧。',
    emptyDesc: '拖入图片、PDF，或使用速记功能。Lovcore 的 AI 会即刻为你整理。',
    inspirationRemoved: '灵感已从档案中移除',
    organizedBy: '已由 Lovcore AI 整理',
    folioCreated: '收藏集已创建',
  },

  // === Default Spaces ===
  defaultSpaces: {
    all: '全部',
    allDesc: '档案库中的每一段记忆。',
    keynotes: '主题演讲',
    keynotesDesc: '收藏的 AI 主题演讲、技术分享和活动页面。',
    agenticCoding: '智能编程',
    agenticCodingDesc: 'Claude Code、编程智能体与描述驱动的软件开发。',
    enterpriseAi: '企业 AI',
    enterpriseAiDesc: '企业落地、智能体工作流与 AI 运营模式。',
    researchPdfs: '研究文档',
    researchPdfsDesc: '深度研究用的长篇报告与 PDF 文档。',
    ventureThesis: '投资洞察',
    ventureThesisDesc: '关于 AI 商业模式变迁的投资笔记与论点。',
  },
};

export default zh;
