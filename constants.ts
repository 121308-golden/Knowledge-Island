
import { CreatorProfile, FileNode, User, PurchasedKnowledge, Project, CreatorAnalytics } from './types';

export const MOCK_CREATOR: CreatorProfile = {
  id: "creator_001",
  name: "林 艾克斯",
  avatar: "https://picsum.photos/200/200",
  knowledgeBaseName: "数字文艺复兴",
  bio: "数字极简主义者，系统思考者，个体主权经济的倡导者。致力于为下一代思考者构建思维工具。",
  socials: [
    { platform: 'twitter', url: '#', handle: '@alex_lin' },
    { platform: 'youtube', url: '#', handle: 'LinCreates' },
    { platform: 'github', url: '#', handle: 'lin-code' }
  ]
};

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    title: '数字文艺复兴',
    description: '现代创作者经济与数字所有权的宣言。',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    lastModified: '2小时前',
    status: 'published',
    stats: { views: 1920, sales: 13470 }
  },
  {
    id: 'proj_2',
    title: 'React 设计模式进阶',
    description: '构建可扩展 React 应用的高级模式与最佳实践。',
    coverImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    lastModified: '1天前',
    status: 'draft',
    stats: { views: 0, sales: 0 }
  },
  {
    id: 'proj_3',
    title: '极简主义生活',
    description: '清理数字与物理生活的终极指南。',
    coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    lastModified: '5天前',
    status: 'published',
    stats: { views: 1280, sales: 8980 }
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
      question: '在“宣言”一章中，你提到的“租赁土地”具体指什么？',
      timestamp: '10分钟前提问',
      fileReference: '宣言.txt',
      count: 142
    },
    {
      id: 'q2',
      question: '“Hooks 深度解析”的源码可以下载吗？',
      timestamp: '2小时前提问',
      fileReference: 'Hooks 深度解析.mp4',
      count: 89
    },
    {
      id: 'q3',
      question: '能否详细说明“一致性”与“强度”的区别？',
      timestamp: '1天前提问',
      fileReference: '01. 核心理念',
      count: 56
    },
    {
      id: 'q4',
      question: '你推荐使用什么工具来构建 Newsletter？',
      timestamp: '5小时前提问',
      fileReference: '02. 实战教程',
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
    title: "数字文艺复兴",
    creator: "林 艾克斯",
    coverImage: "https://picsum.photos/id/20/400/300",
    progress: 35,
    totalItems: 12,
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
    name: '01. 核心理念',
    type: 'folder',
    isOpen: true,
    children: [
      {
        id: 'file_1_1',
        name: '宣言.md',
        type: 'text',
        content: `# 数字文艺复兴

把守关卡的时代正在崩塌。我们正在进入一个个人杠杆无限放大的时代。

## 1. 每日创作
一致性是精通之母。不要等待灵感；通过行动来召唤它。

![创意工作空间](https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80)

### 复利效应
每天微小的进步会带来长期的巨大改变。如果你每天进步 1%，一年后你会变强 37 倍。

## 2. 公开分享
知识因分享而增值。囤积想法只会导致停滞。在公众视野中构建你的作品 (Build in public)。

### 为什么“公开工作”有效
1. 建立信任。
2. 建立反馈循环。
3. 吸引志同道合的人。

## 3. 拥有你的平台
社交媒体是**租赁的土地**。建立你自己的城堡（网站、Newsletter、产品）。

![服务器机房](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80)

## 4. 跨学科思维
将艺术与代码结合，哲学与商业结合。魔法发生在交汇处。

### 通才优势
专业化是留给昆虫的。人类应该能够换尿布、策划入侵、杀猪、驾船、设计建筑、写十四行诗、结账、砌墙、正骨、抚慰临终者、接受命令、下达命令、合作、独处、解方程、分析新问题、铲粪、编程、做一顿美餐、高效战斗、英勇赴死。

## 5. 长期游戏
与长期主义者玩长期游戏。复利不仅适用于金钱，也适用于关系和技能。`
      },
      {
        id: 'file_1_2',
        name: '灵感板',
        type: 'image',
        content: 'https://picsum.photos/800/600'
      }
    ]
  },
  {
    id: 'root_2',
    name: '02. 实战教程',
    type: 'folder',
    isOpen: false,
    children: [
      {
        id: 'root_2_sub',
        name: 'React 进阶',
        type: 'folder',
        children: [
           {
            id: 'file_2_1',
            name: 'Hooks 深度解析.mp4',
            type: 'video',
            content: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
          },
          {
            id: 'file_2_2',
            name: '状态管理之道.txt',
            type: 'text',
            content: "2024年的状态管理在于‘简’。Signals 正在崛起，但 Context + Reducer 仍然是原生强大的组合。"
          }
        ]
      },
      {
        id: 'file_2_3',
        name: '设计原则.mp3',
        type: 'audio',
        content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
      },
      {
        id: 'file_2_4',
        name: 'TraceMonkey 性能优化.pdf',
        type: 'pdf',
        content: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf'
      }
    ]
  },
  {
    id: 'root_3',
    name: '03. 归档',
    type: 'folder',
    children: [
      {
        id: 'file_3_1',
        name: '2023 年度总结.txt',
        type: 'text',
        content: "2023 是奠基之年。我们发布了 12 款产品，撰写了 50 篇文章。"
      }
    ]
  }
];
