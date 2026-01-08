
import { CreatorProfile, FileNode, User, PurchasedKnowledge, Project, CreatorAnalytics } from './types';

export const MOCK_CREATOR: CreatorProfile = {
  id: "creator_001",
  name: "林 艾克斯",
  avatar: "https://picsum.photos/200/200",
  knowledgeBaseName: "考研英语实战技巧",
  bio: "考研英语实战讲师，专注可复制的提分方法与真题拆解。",
  socials: [
    { platform: 'twitter', url: '#', handle: '@alex_lin' },
    { platform: 'youtube', url: '#', handle: 'LinCreates' },
    { platform: 'github', url: '#', handle: 'lin-code' }
  ]
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    title: '考研英语实战技巧',
    description: '不靠死记硬背，只讲可操作、可复制、提分快的实战方法。',
    lastModified: '2小时前',
    status: 'published',
    stats: { views: 12500, sales: 850 }
  },
  {
    id: 'proj_2',
    title: 'React 设计模式进阶',
    description: '构建可扩展 React 应用的高级模式与最佳实践。',
    lastModified: '1天前',
    status: 'draft',
    stats: { views: 0, sales: 0 }
  },
  {
    id: 'proj_3',
    title: '极简主义生活',
    description: '清理数字与物理生活的终极指南。',
    lastModified: '5天前',
    status: 'published',
    stats: { views: 5400, sales: 320 }
  }
];

export const MOCK_ANALYTICS: CreatorAnalytics = {
  totalRevenue: 12450,
  totalReaders: 3200,
  activeSubscribers: 850,
  avgTimeSpent: '18分 20秒',
  recentQuestions: [
    {
      id: 'q1',
      question: '在"第1章 考研英语全景解析"中，英一和英二的主要区别是什么？',
      timestamp: '10分钟前提问',
      fileReference: '第1章 考研英语全景解析.md',
      count: 142
    },
    {
      id: 'q2',
      question: '"第4章 阅读理解"中的定位技巧具体怎么操作？',
      timestamp: '2小时前提问',
      fileReference: '第4章 阅读理解.md',
      count: 89
    },
    {
      id: 'q3',
      question: '能否详细说明"第6章 写作"中模板化和低分的区别？',
      timestamp: '1天前提问',
      fileReference: '第6章 写作.md',
      count: 56
    },
    {
      id: 'q4',
      question: '你推荐如何安排"第12章 考场时间分配"？',
      timestamp: '5小时前提问',
      fileReference: '第12章 考场时间分配.md',
      count: 31
    }
  ]
};

export const CURRENT_USER: User = {
  id: "user_999",
  name: "陈子豪",
  email: "chen.zihao@example.com",
  avatar: "https://i.pravatar.cc/150?u=chen",
  joinDate: "2023年加入",
  membershipTier: 'Pro',
  membershipExpiresAt: '2024-12-31',
  credits: 850
};

export const PURCHASED_ITEMS: PurchasedKnowledge[] = [
  {
    id: "kb_001",
    title: "考研英语实战技巧",
    creator: "林 艾克斯",
    coverImage: "https://picsum.photos/id/20/400/300",
    progress: 35,
    totalItems: 14,
    lastAccessed: "2小时前"
  },
  {
    id: "kb_002",
    title: "系统设计大师课",
    creator: "技术专家 Pro",
    coverImage: "https://picsum.photos/id/60/400/300",
    progress: 8,
    totalItems: 45,
    lastAccessed: "3天前"
  },
  {
    id: "kb_003",
    title: "极简生活指南",
    creator: "Sarah J.",
    coverImage: "https://picsum.photos/id/42/400/300",
    progress: 100,
    totalItems: 20,
    lastAccessed: "1个月前"
  },
  {
    id: "kb_004",
    title: "独立黑客手册",
    creator: "Pieter L.",
    coverImage: "https://picsum.photos/id/180/400/300",
    progress: 0,
    totalItems: 15,
    lastAccessed: "从未访问"
  }
];

export const MOCK_FILES: FileNode[] = [
  {
    id: 'root_1',
    name: '01. 备考战略与时间规划',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'file_1_1',
        name: '第1章 考研英语全景解析.md',
        type: 'text',
        content: `# 第1章 考研英语全景解析

![考研英语全景解析](https://picx.zhimg.com/v2-6cfa432a3664662c9c69475fed60fafb_1440w.jpg?source=172ae18b)

## 考研英语（一）vs（二）区别详解

### 题型对比
- **相同点**：完形填空、阅读理解、新题型、写作（小作文+大作文）
- **差异点**：英一有翻译（英译汉，5句×2分=10分），英二无翻译；英一阅读文章更长、词汇更学术化

### 难度与适用专业
- **英语（一）**：难度更高，词汇量要求约5500+，文章多选自学术期刊、科技文献；适用于学硕、部分专硕（如法律硕士、医学硕士等）
- **英语（二）**：难度相对较低，词汇量约4500+，文章更贴近生活、商业、教育；适用于大部分专硕（如MBA、MPA、工程硕士等）

### 近年趋势
- **英一**：保持高难度，但更注重逻辑推理而非纯词汇记忆
- **英二**：2020年后难度有所提升，向英一靠拢，但仍保持相对友好的风格

![考研视频](/考研.mp4)

## 近5年命题趋势分析

### 反套路化
命题组已意识到考生对"技巧"的过度依赖，开始打破固定模式：
- 不再有"绝对词必错"的简单规律
- 干扰项设计更巧妙，需要真正理解文章而非机械匹配

### 语境化
- **词汇题**：不再孤立考单词，而是考"在特定语境下的含义"
- **完形填空**：更依赖上下文逻辑，而非单纯语法规则

### 逻辑化
- 文章结构更清晰，但逻辑链更复杂
- 需要把握"作者观点→论证过程→结论"的整体脉络

## 各题型分值分布 & 提分性价比排序

### 分值分布（总分100分）

**英语（一）**：
- 完形填空：10分（20题×0.5分）
- 阅读理解：40分（4篇×10分，每篇5题×2分）
- 新题型：10分（7选5/小标题/排序）
- 翻译：10分（5句英译汉，每句2分）
- 小作文：10分（书信/通知等）
- 大作文：20分（图画作文）

**英语（二）**：
- 完形填空：10分
- 阅读理解：40分
- 新题型：10分
- 小作文：10分
- 大作文：15分（图表作文）

### 提分性价比排序

**第一梯队：阅读（40分）**
- 投入产出比最高，是拉开差距的关键
- 建议时间：60-70分钟（英一）/ 60分钟（英二）

**第二梯队：作文（30分/25分）**
- 通过模板和句型可以快速提分
- 建议时间：50分钟（必须留足！）

**第三梯队：新题型（10分）**
- 技巧性强，掌握方法后稳定拿分
- 建议时间：15-20分钟

**第四梯队：完型（10分）**
- 性价比最低，但不应完全放弃
- 建议时间：10-15分钟（英一）/ 10分钟（英二）

**第五梯队：翻译（10分，仅英一）**
- 难度大，但通过训练可稳定拿6-8分
- 建议时间：20分钟

## 备考思路

### 核心策略
1. **先抓大块**：优先攻克阅读和作文，这两项占70分
2. **再补弱项**：在保证大块稳定的基础上，提升新题型和完型
3. **组合拳训练**：定位 + 同义替换识别 + 干扰项排除

### 实战口诀
- **阅读**："定位准、替换对、干扰排"
- **作文**："结构清、句型亮、逻辑顺"
- **新题型**："先选项、找钩子、连逻辑"
- **完型**："上下文、复现线、不纠结"

### 时间分配原则
- 高分值题型优先保证时间
- 作文必须留足50分钟，不可压缩
- 完型不要过度纠结，10-15分钟即可

## 总结

考研英语不是"背单词"的考试，而是"理解语篇"的考试。掌握正确的备考策略，区分英一英二的特点，合理分配时间和精力，是取得高分的关键。接下来的章节，我们将深入每个题型的实战技巧。`
      },
      {
        id: 'file_1_2',
        name: '第2章 四阶段高效复习计划.md',
        type: 'text',
        content: `# 第2章 四阶段高效复习计划（6–8个月）

- 基础阶段(2–3月)：词汇+长难句+真题语感启蒙。
- 强化阶段(2–3月)：分题型技巧训练，精读精练。
- 冲刺阶段(1.5–2月)：套题模考 + 作文模板打磨。
- 临考阶段(2周)：查漏补缺，心态与时间分配演练。
- 每日时间表示例：在校生 3–4h（晨读词汇+晚间精读），在职 2–3h（碎片背词+晚间真题/作文）。`
      }
    ]
  },
  {
    id: 'root_2',
    name: '02. 英语（一）全题型实战',
    type: 'folder',
    children: [
      {
        id: 'file_2_1',
        name: '第3章 完形填空（英一）.md',
        type: 'text',
        content: `# 第3章 完形填空——从“蒙”到“稳拿6+”
- 规律：逻辑连接词 > 固定搭配 > 词义辨析；先易后难不纠结。
- 三原则：上下文一致性 / 复现线索 / 情感态度判断。`
      },
      {
        id: 'file_2_2',
        name: '第4章 阅读理解（英一）.md',
        type: 'text',
        content: `# 第4章 阅读理解——核心战场
- 关键：定位+同义替换+干扰项排除；主旨/细节/推断/词义/例证题各有套路。
- 易错陷阱：偷换概念、无中生有、过度推断、以偏概全、正话反说、张冠李戴。`
      },
      {
        id: 'file_2_3',
        name: '第5章 新题型（英一）.md',
        type: 'text',
        content: `# 第5章 新题型——稳拿8–10分
- 7选5/小标题/排序：先读选项找“钩子”，逻辑信号词和指代是关键。`
      },
      {
        id: 'file_2_4',
        name: '第6章 写作（英一）.md',
        type: 'text',
        content: `# 第6章 写作——模板化≠低分
- 小作文：目的-内容-期待三段式；场景模板要口语化但规范。
- 大作文：图画/图表三段式；高分句型适度用，重逻辑与个性化。`
      }
    ]
  },
  {
    id: 'root_3',
    name: '03. 英语（二）全题型实战',
    type: 'folder',
    children: [
      {
        id: 'file_3_1',
        name: '第7章 完形填空（英二）.md',
        type: 'text',
        content: `# 第7章 完形填空（英二）
- 难度更基础，逻辑更清晰；依赖上下文复现和常识判断。`
      },
      {
        id: 'file_3_2',
        name: '第8章 阅读理解（英二）.md',
        type: 'text',
        content: `# 第8章 阅读理解（英二）
- 题材贴近生活，细节题更多；训练信息匹配与数据理解，关注作者态度题。`
      },
      {
        id: 'file_3_3',
        name: '第9章 新题型（英二）.md',
        type: 'text',
        content: `# 第9章 新题型（英二）
- 多为小标题/信息匹配，抓段落关键词、人名地名数字即可。`
      },
      {
        id: 'file_3_4',
        name: '第10章 写作（英二）.md',
        type: 'text',
        content: `# 第10章 写作（英二）——图表作文突破
- 三段式：描述图表→分析原因→总结/预测；重趋势与原因，不罗列数据。`
      }
    ]
  },
  {
    id: 'root_4',
    name: '04. 通用提分策略与冲刺',
    type: 'folder',
    children: [
      {
        id: 'file_4_1',
        name: '第11章 词汇与长难句.md',
        type: 'text',
        content: `# 第11章 词汇与长难句高效突破
- 真题词汇优先记忆，长难句主干剥离法，按话题分块记核心词。`
      },
      {
        id: 'file_4_2',
        name: '第12章 考场时间分配.md',
        type: 'text',
        content: `# 第12章 考场时间分配黄金方案
- 英一：完型10–15m / 阅读60–70m / 新题型15–20m / 翻译20m / 作文50m。
- 英二：完型10m / 阅读60m / 新题型15m / 作文50m。作文必须留足50分钟。`
      },
      {
        id: 'file_4_3',
        name: '第13章 常见误区.md',
        type: 'text',
        content: `# 第13章 常见误区与避坑
- 盲目刷题不总结；死背模板不内化；忽视真题、迷信模拟题；完型耗时过长挤压作文。`
      },
      {
        id: 'file_4_4',
        name: '第14章 冲刺模考与复盘.md',
        type: 'text',
        content: `# 第14章 冲刺阶段模考与复盘
- 一套真题=限时+涂卡+作文手写；错题本模板；考前10天每日任务清单。`
      }
    ]
  },
  {
    id: 'root_5',
    name: '附录与资源',
    type: 'folder',
    children: [
      {
        id: 'file_5_1',
        name: '附录.md',
        type: 'text',
        content: `# 附录（课程配套资源）
- 高频逻辑连接词表
- 作文万能句型50句（分主题）
- 近10年真题考点统计表
- 英一/英二核心词汇分级手册

# 课程特色
- 区分英一/英二，拒绝一刀切；每章含真题案例+错题分析+实战口诀。
- 强调可操作性：学了就能用，用了就提分；适配不同基础的60→80+路径。`
      }
    ]
  }
];
