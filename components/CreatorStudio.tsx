import React, { useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { FileNode, PublishConfig, Project } from '../types';
import FileTree from './FileTree';
import { MOCK_PROJECTS, MOCK_ANALYTICS } from '../constants';
import { 
  FolderPlus, FilePlus, Upload, Save, Settings, 
  Eye, Check, X, DollarSign, Lock, ShieldAlert, Type, Mic,
  Layout, BarChart2, Briefcase, Plus, Users, MessageSquare, Book, HelpCircle, LogOut
} from 'lucide-react';

interface CreatorStudioProps {
  files: FileNode[];
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>;
  onExitStudio: () => void;
}

type CreatorView = 'projects' | 'analytics' | 'editor';
interface ProjectSettings {
  title: string;
  description: string;
  coverUrl: string;
  tags: string;
  status: 'published' | 'draft';
  textCost: number;
  audioCost: number;
  permissions: {
    allowCopy: boolean;
    allowDownload: boolean;
    watermark: boolean;
  };
}

const CreatorStudio: React.FC<CreatorStudioProps> = ({ files, setFiles, onExitStudio }) => {
  const [currentView, setCurrentView] = useState<CreatorView>('projects');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Editor State
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const getDefaultPublishConfig = (): PublishConfig => ({
    isPublished: false,
    textCost: 5,
    audioCost: 10,
    permissions: { allowCopy: false, allowDownload: false, watermark: true }
  });
  const [tempPublishConfig, setTempPublishConfig] = useState<PublishConfig>(getDefaultPublishConfig());

  const createProjectSettings = (project?: Project): ProjectSettings => ({
    title: project?.title || '未命名项目',
    description: project?.description || '请填写项目简介。',
    coverUrl: project?.coverImage || '',
    tags: '',
    status: project?.status || 'draft',
    textCost: 5,
    audioCost: 10,
    permissions: { allowCopy: false, allowDownload: false, watermark: true }
  });

  const [projectSettingsById, setProjectSettingsById] = useState<Record<string, ProjectSettings>>(() => {
    const initial: Record<string, ProjectSettings> = {};
    MOCK_PROJECTS.forEach(project => {
      initial[project.id] = createProjectSettings(project);
    });
    return initial;
  });

  // --- EDITOR LOGIC HELPERS ---
  const findFile = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findFile(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };
  const selectedFile = selectedFileId ? findFile(files, selectedFileId) : null;
  const activeProjectSettings = selectedProjectId ? projectSettingsById[selectedProjectId] : null;

  const escapeHtml = (value: string) => (
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;')
  );

  const renderInlineMarkdown = (value: string) => {
    const escaped = escapeHtml(value);
    return escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  };

  const markdownToHtml = (content: string) => {
    const lines = content.split(/\r?\n/);
    const html: string[] = [];
    let inList = false;

    const closeList = () => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        return;
      }

      const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        closeList();
        html.push(`<img src="${escapeHtml(imageMatch[2])}" alt="${escapeHtml(imageMatch[1])}" />`);
        return;
      }

      const attachmentMatch = trimmed.match(/^\[附件\]\s*(.+)$/);
      if (attachmentMatch) {
        closeList();
        html.push(`<p><strong>附件：</strong>${renderInlineMarkdown(attachmentMatch[1])}</p>`);
        return;
      }

      if (/^#\s+/.test(trimmed)) {
        closeList();
        html.push(`<h1>${renderInlineMarkdown(trimmed.replace(/^#\s+/, ''))}</h1>`);
        return;
      }

      if (/^##\s+/.test(trimmed)) {
        closeList();
        html.push(`<h2>${renderInlineMarkdown(trimmed.replace(/^##\s+/, ''))}</h2>`);
        return;
      }

      if (/^###\s+/.test(trimmed)) {
        closeList();
        html.push(`<h3>${renderInlineMarkdown(trimmed.replace(/^###\s+/, ''))}</h3>`);
        return;
      }

      const listMatch = trimmed.match(/^(\d+\.|-)\s+(.+)$/);
      if (listMatch) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${renderInlineMarkdown(listMatch[2])}</li>`);
        return;
      }

      closeList();
      html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
    });

    closeList();
    return html.join('');
  };

  const prepareEditorContent = (content: string) => {
    if (!content) return '<p></p>';
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(content);
    return looksLikeHtml ? content : markdownToHtml(content);
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({
        placeholder: '写点什么，输入“/”唤起模块菜单（原型占位）'
      })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[520px] outline-none text-[15px] leading-7 text-gray-800'
      }
    }
  });

  React.useEffect(() => {
    if (!selectedFile) return;
    if (selectedFile.type === 'text' && editor) {
      const nextContent = prepareEditorContent(selectedFile.content || '');
      editor.commands.setContent(nextContent, false);
    }
    setTempPublishConfig(selectedFile.publishConfig || getDefaultPublishConfig());
  }, [selectedFileId, editor]);

  const handleCreateFolder = () => {
    const newFolder: FileNode = { id: `folder_${Date.now()}`, name: '新建文件夹', type: 'folder', isOpen: true, children: [] };
    setFiles([...files, newFolder]);
  };
  const handleCreateDoc = () => {
    const newDoc: FileNode = {
      id: `doc_${Date.now()}`,
      name: '未命名文档.md',
      type: 'text',
      content: '<h1>新文档</h1><p>在此开始写作...</p>',
      publishConfig: undefined
    };
    setFiles([...files, newDoc]);
    setSelectedFileId(newDoc.id);
  };
  const handleUpload = () => {
    const newImage: FileNode = { id: `img_${Date.now()}`, name: `图片_${Date.now()}.png`, type: 'image', content: 'https://picsum.photos/600/400' };
    setFiles([...files, newImage]);
  };
  const handleSaveContent = () => {
    if (!selectedFileId || !editor || selectedFile?.type !== 'text') return;
    const serializedContent = editor.getHTML();
    const updateNodes = (nodes: FileNode[]): FileNode[] => nodes.map(node => {
        if (node.id === selectedFileId) return { ...node, content: serializedContent };
        if (node.children) return { ...node, children: updateNodes(node.children) };
        return node;
      });
    setFiles(updateNodes(files));
    alert("保存成功!");
  };
  const handlePublish = () => {
    if (!selectedFileId) return;
    const configToSave = { ...tempPublishConfig, isPublished: true };
    const updateNodes = (nodes: FileNode[]): FileNode[] => nodes.map(node => {
        if (node.id === selectedFileId) return { ...node, publishConfig: configToSave };
        if (node.children) return { ...node, children: updateNodes(node.children) };
        return node;
      });
    setFiles(updateNodes(files));
    setIsPublishModalOpen(false);
    alert("发布设置已更新!");
  };

  const handleCreateProject = () => {
    const id = `proj_${Date.now()}`;
    const newProject: Project = {
      id,
      title: '未命名项目',
      description: '请填写项目简介。',
      lastModified: '刚刚',
      status: 'draft',
      stats: { views: 0, sales: 0 }
    };
    setProjects(prev => [newProject, ...prev]);
    setProjectSettingsById(prev => ({
      ...prev,
      [id]: createProjectSettings(newProject)
    }));
    setSelectedProjectId(id);
    setCurrentView('editor');
    setIsSettingsOpen(true);
  };

  const handleSaveProjectSettings = () => {
    if (!selectedProjectId || !activeProjectSettings) return;
    setProjects(prev => prev.map(project => {
      if (project.id !== selectedProjectId) return project;
      return {
        ...project,
        title: activeProjectSettings.title,
        description: activeProjectSettings.description,
        coverImage: activeProjectSettings.coverUrl || project.coverImage,
        status: activeProjectSettings.status,
        lastModified: '刚刚'
      };
    }));
    alert("项目设置已保存");
  };

  // --- VIEW COMPONENTS ---

  const ProjectsView = () => (
    <div className="p-8 animate-fadeIn max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">我的项目</h1>
                <p className="text-gray-500 mt-2 font-medium">管理你的知识库和数字产品。</p>
            </div>
            <button
                onClick={handleCreateProject}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
            >
                <Plus size={20} /> 新建项目
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Existing Projects (iOS 18 Style) */}
            {projects.map(project => (
                <div 
                    key={project.id} 
                    onClick={() => {
                        setSelectedProjectId(project.id);
                        setCurrentView('editor');
                        setIsSettingsOpen(true);
                    }}
                    className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-95 transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-80 group relative"
                >
                    <div className="h-40 relative overflow-hidden">
                        {project.coverImage && (
                          <img
                            src={project.coverImage}
                            alt={`${project.title} 封面`}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/80 via-indigo-50/50 to-white/30" />
                        <div className="relative z-10 p-8 flex flex-col justify-between h-full">
                         {project.status === 'published' ? (
                             <span className="absolute top-6 right-6 bg-white/80 backdrop-blur-md text-green-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                 已发布
                             </span>
                         ) : (
                             <span className="absolute top-6 right-6 bg-white/80 backdrop-blur-md text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                 草稿
                             </span>
                         )}
                         <div className="w-12 h-12 bg-white/90 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300">
                             <Book size={24} />
                         </div>
                        </div>
                    </div>
                    <div className="p-8 flex-1 flex flex-col justify-between">
                        <div>
                            <h3 className="font-bold text-gray-900 text-xl leading-tight mb-3 truncate group-hover:text-blue-600 transition-colors">{project.title}</h3>
                            <p className="text-gray-500 text-sm line-clamp-2 font-medium">{project.description}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mt-4">
                            <span>{project.lastModified}</span>
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5"><Users size={14}/> {project.stats.views}</span>
                                <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full">￥ {project.stats.sales.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );

  const AnalyticsView = () => {
      const [activeStatIndex, setActiveStatIndex] = useState<number | null>(null);
      const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
      const [selectedRevenueType, setSelectedRevenueType] = useState<'总和' | '课程收入' | 'AI订阅收入'>('总和');
      const [selectedProjectCategory, setSelectedProjectCategory] = useState<'总和' | '数字文艺复兴' | '极简生活主义'>('总和');
      const buildTargetCumulativeTimeline = (
        length: number,
        target: number,
        config: {
          dailyBase: number;
          dailyWave: number;
          weeklyBonus: number;
          dailyDrift?: number;
          segmentMultipliers?: number[];
        }
      ) => {
        if (length <= 1) {
          return [{ day: 1, value: 0, isWeek: true }];
        }
        const segmentMultipliers = config.segmentMultipliers ?? [1];
        const segmentSize = Math.ceil((length - 1) / segmentMultipliers.length);
        const increments = Array.from({ length: length - 1 }, (_, index) => {
          const day = index + 2;
          const wave = Math.round(Math.abs(Math.sin(index / 4.5)) * config.dailyWave);
          const drift = config.dailyDrift ? config.dailyDrift * index : 0;
          const dailyStep = config.dailyBase + wave + drift;
          const weeklyBoost = day % 7 === 0 ? config.weeklyBonus : 0;
          const segmentIndex = Math.min(Math.floor(index / segmentSize), segmentMultipliers.length - 1);
          const segmentMultiplier = segmentMultipliers[segmentIndex];
          const jitter = 1 + ((index % 5) - 2) * 0.04;
          return Math.max(1, (dailyStep + weeklyBoost) * segmentMultiplier * jitter);
        });
        const sum = increments.reduce((acc, value) => acc + value, 0);
        const scale = sum > 0 ? target / sum : 0;
        let total = 0;
        const timeline = Array.from({ length }, (_, index) => {
          const day = index + 1;
          if (index === 0) {
            return { day, value: 0, isWeek: day % 7 === 0 };
          }
          total += increments[index - 1] * scale;
          const value = index === length - 1 ? target : Math.max(0, Math.round(total));
          return { day, value, isWeek: day % 7 === 0 };
        });
        return timeline;
      };

      const historyLength = 68;
      const baseRevenueTarget = 22450;
      const baseTotalSubscriptionTarget = 3200;
      const baseActiveSubscriptionTarget = 850;
      const revenueTypeMultiplier = {
        '总和': 1,
        '课程收入': 0.65,
        'AI订阅收入': 0.35
      };
      const projectMultiplier = {
        '总和': 1,
        '数字文艺复兴': 0.6,
        '极简生活主义': 0.4
      };
      const revenueTarget = Math.round(
        baseRevenueTarget * revenueTypeMultiplier[selectedRevenueType] * projectMultiplier[selectedProjectCategory]
      );
      const totalSubscriptionTarget = Math.round(
        baseTotalSubscriptionTarget * projectMultiplier[selectedProjectCategory]
      );
      const activeSubscriptionTarget = Math.round(
        baseActiveSubscriptionTarget * projectMultiplier[selectedProjectCategory]
      );
      const baseMonthGrowth = 12;
      const baseTodayNew = 54;
      const baseRetention = 92;
      const revenueMonthGrowth = Math.max(
        2,
        Math.round(baseMonthGrowth * revenueTypeMultiplier[selectedRevenueType] * projectMultiplier[selectedProjectCategory])
      );
      const todayNew = Math.max(
        6,
        Math.round(
          baseTodayNew *
            projectMultiplier[selectedProjectCategory]
        )
      );
      const retentionRate = Math.min(
        99,
        Math.max(
          78,
          Math.round(
            baseRetention -
              (1 - projectMultiplier[selectedProjectCategory]) * 8
          )
        )
      );
      const projectQuestions = {
        '数字文艺复兴': [
          {
            id: 'dr_q1',
            question: '在“宣言”一章中，你提到的“租赁土地”具体指什么？',
            timestamp: '10分钟前提问',
            fileReference: '宣言.txt',
            count: 142
          },
          {
            id: 'dr_q2',
            question: '能否详细说明“一致性”与“强度”的区别？',
            timestamp: '1天前提问',
            fileReference: '01. 核心理念',
            count: 56
          },
          {
            id: 'dr_q3',
            question: '你推荐使用什么工具来构建 Newsletter？',
            timestamp: '5小时前提问',
            fileReference: '02. 实战教程',
            count: 31
          }
        ],
        '极简生活主义': [
          {
            id: 'ml_q1',
            question: '“极简生活主义”的第一步应该做什么？',
            timestamp: '20分钟前提问',
            fileReference: '极简生活主义导读',
            count: 95
          },
          {
            id: 'ml_q2',
            question: '如何规划 30 天断舍离？',
            timestamp: '3小时前提问',
            fileReference: '整理路线图',
            count: 67
          },
          {
            id: 'ml_q3',
            question: '关于“数字排毒”的建议是什么？',
            timestamp: '1天前提问',
            fileReference: '数字排毒指南',
            count: 48
          }
        ]
      };
      const mergedQuestions = [
        ...projectQuestions['数字文艺复兴'],
        ...projectQuestions['极简生活主义']
      ];
      const questionsForCategory =
        selectedProjectCategory === '总和'
          ? mergedQuestions
          : projectQuestions[selectedProjectCategory];
      const sortedQuestions = [...questionsForCategory].sort((a, b) => b.count - a.count);
      const stats = [
        {
          title: "总收入",
          val: `￥${revenueTarget.toLocaleString()}`,
          change: `本月增长 ${revenueMonthGrowth}%`,
          icon: DollarSign,
          color: "text-green-500",
          unitLabel: "￥",
          unitName: "人民币",
          axisMax: 25000,
          accent: { line: "#22c55e", area: "#bbf7d0", node: "#86efac", week: "#16a34a" },
          timeline: buildTargetCumulativeTimeline(historyLength, revenueTarget, {
            dailyBase: 280,
            dailyWave: 160,
            weeklyBonus: 2300,
            dailyDrift: 2,
            segmentMultipliers: [0.6, 1.35, 0.85, 1.5, 1.05]
          })
        },
        {
          title: "总订阅数",
          val: totalSubscriptionTarget.toLocaleString(),
          change: `今日新增 ${todayNew}`,
          icon: Users,
          color: "text-blue-500",
          unitLabel: "人",
          unitName: "人",
          axisMax: 4000,
          accent: { line: "#3b82f6", area: "#bfdbfe", node: "#93c5fd", week: "#2563eb" },
          timeline: buildTargetCumulativeTimeline(historyLength, totalSubscriptionTarget, {
            dailyBase: 36,
            dailyWave: 18,
            weeklyBonus: 260,
            dailyDrift: 0.7,
            segmentMultipliers: [0.7, 1.25, 0.9, 1.2, 0.95]
          })
        },
        {
          title: "活跃订阅",
          val: activeSubscriptionTarget.toLocaleString(),
          change: `留存率 ${retentionRate}%`,
          icon: Briefcase,
          color: "text-amber-500",
          unitLabel: "人",
          unitName: "人",
          axisMax: 1000,
          accent: { line: "#f59e0b", area: "#fde68a", node: "#fcd34d", week: "#d97706" },
          timeline: buildTargetCumulativeTimeline(historyLength, activeSubscriptionTarget, {
            dailyBase: 8,
            dailyWave: 5,
            weeklyBonus: 60,
            dailyDrift: 0.1,
            segmentMultipliers: [0.8, 1.2, 0.9, 1.15, 0.85]
          })
        }
      ];
      const activeStat = activeStatIndex !== null ? stats[activeStatIndex] : null;
      const timelineLength = activeStat ? activeStat.timeline.length : 0;
      const maxTimelineValue = activeStat ? Math.max(...activeStat.timeline.map(item => item.value)) : 1;
      const chartWidth = 720;
      const chartHeight = 230;
      const chartPaddingLeft = 70;
      const chartPaddingRight = 24;
      const chartPaddingTop = 18;
      const chartPaddingBottom = 40;
      const minStep = 18;
      const chartSvgWidth = Math.max(
        chartWidth,
        chartPaddingLeft + chartPaddingRight + Math.max(0, timelineLength - 1) * minStep
      );
      const chartPlotWidth = chartSvgWidth - chartPaddingLeft - chartPaddingRight;
      const chartPlotHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
      const chartBottom = chartPaddingTop + chartPlotHeight;
      const yTicks = 5;
      const getNiceStep = (range: number, ticks: number) => {
        if (range <= 0) return 1;
        const roughStep = range / (ticks - 1);
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const residual = roughStep / magnitude;
        if (residual <= 1) return 1 * magnitude;
        if (residual <= 2) return 2 * magnitude;
        if (residual <= 5) return 5 * magnitude;
        return 10 * magnitude;
      };
      const formatYAxisValue = (value: number) => {
        if (!activeStat) return '';
        const isPrefixUnit = ['$', '￥', '¥'].includes(activeStat.unitLabel);
        return isPrefixUnit ? `${activeStat.unitLabel}${value}` : `${value}`;
      };
      const niceStep = getNiceStep(maxTimelineValue, yTicks);
      const niceMax = Math.ceil(maxTimelineValue / niceStep) * niceStep;
      const axisMax = activeStat?.axisMax;
      const yScaleMax = axisMax ? Math.max(axisMax, maxTimelineValue) : niceMax;
      const yAxisStep = yScaleMax / (yTicks - 1);
      const yAxisValues = Array.from({ length: yTicks }, (_, index) =>
        Math.round(index * yAxisStep)
      );
      const step = timelineLength > 1 ? chartPlotWidth / (timelineLength - 1) : chartPlotWidth;
      const chartPoints = activeStat
        ? activeStat.timeline.map((point, index) => {
            const x = chartPaddingLeft + index * step;
            const y =
              chartPaddingTop +
              (1 - point.value / yScaleMax) * chartPlotHeight;
            return { ...point, x, y };
          })
        : [];
      const linePath = chartPoints.length
        ? `M ${chartPoints.map(point => `${point.x},${point.y}`).join(' L ')}`
        : '';
      const gradientKey = activeStat ? activeStat.title.replace(/\s+/g, '-') : 'stat';
      const lineGradientId = `chartLine-${gradientKey}`;
      const timelineStart = new Date('2025-11-01T00:00:00');
      const formatFullDate = (date: Date) =>
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const formatDateLabel = (date: Date) => formatFullDate(date);
      const tickInterval = 7;
      const tickOffsets: number[] = [];
      for (let i = 0; i < timelineLength; i += tickInterval) {
        tickOffsets.push(i);
      }
      if (timelineLength > 0 && tickOffsets[tickOffsets.length - 1] !== timelineLength - 1) {
        tickOffsets.push(timelineLength - 1);
      }
      const xAxisTicks = tickOffsets.map((offset) => {
        const date = new Date(timelineStart);
        date.setDate(timelineStart.getDate() + offset);
        return { index: offset, label: formatDateLabel(date) };
      });
      const formatTooltipValue = (value: number) => {
        if (!activeStat) return '';
        const formatted = value.toLocaleString();
        const isPrefixUnit = ['$', '￥', '¥'].includes(activeStat.unitLabel);
        return isPrefixUnit ? `${activeStat.unitLabel}${formatted}` : `${formatted}${activeStat.unitLabel}`;
      };
      const hoveredPoint = hoveredIndex !== null ? chartPoints[hoveredIndex] : null;
      const hoveredDate = hoveredIndex !== null ? new Date(timelineStart) : null;
      if (hoveredDate && hoveredIndex !== null) {
        hoveredDate.setDate(timelineStart.getDate() + hoveredIndex);
      }
      const tooltipWidth = 180;
      const tooltipLeft = hoveredPoint
        ? Math.min(Math.max(hoveredPoint.x - tooltipWidth / 2, 12), chartSvgWidth - tooltipWidth - 12)
        : 0;
      const tooltipTop = hoveredPoint
        ? Math.max(hoveredPoint.y - 80, 12)
        : 0;

      return (
        <div className="p-8 animate-fadeIn max-w-7xl mx-auto w-full h-full overflow-y-auto">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">数据仪表盘</h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[11px] font-semibold text-gray-400">收入类型</span>
                  <select
                    value={selectedRevenueType}
                    onChange={(event) => {
                      setSelectedRevenueType(event.target.value as '总和' | '课程收入' | 'AI订阅收入');
                      setHoveredIndex(null);
                    }}
                    className="h-10 min-w-[160px] px-4 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-md shadow-blue-100/60 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                  >
                    <option>总和</option>
                    <option>课程收入</option>
                    <option>AI订阅收入</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <span className="text-[11px] font-semibold text-gray-400">项目分类</span>
                  <select
                    value={selectedProjectCategory}
                    onChange={(event) => {
                      setSelectedProjectCategory(event.target.value as '总和' | '数字文艺复兴' | '极简生活主义');
                      setHoveredIndex(null);
                    }}
                    className="h-10 min-w-[160px] px-4 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-md shadow-blue-100/60 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition"
                  >
                    <option>总和</option>
                    <option>数字文艺复兴</option>
                    <option>极简生活主义</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Stats Grid (iOS 18 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {stats.map((stat, idx) => {
                  const isActive = activeStatIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveStatIndex((current) => (current === idx ? null : idx));
                        setHoveredIndex(null);
                      }}
                      className={`text-left bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col transition-all duration-300 cursor-pointer ${isActive ? 'scale-[1.06] shadow-lg ring-2 ring-blue-100' : 'hover:scale-105'}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`p-2 rounded-full bg-gray-50 ${stat.color.replace('text', 'bg').replace('500', '100')}`}>
                           <stat.icon size={16} className={stat.color} />
                        </div>
                        <span className="text-gray-500 text-sm font-bold">{stat.title}</span>
                      </div>
                      <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{stat.val}</span>
                      <span className={`text-xs font-bold mt-2 ${stat.color}`}>{stat.change}</span>
                    </button>
                  );
                })}
            </div>

            {activeStat && (
              <div className="mb-10 animate-fadeIn">
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm px-8 py-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">趋势折线</div>
                      <h2 className="text-lg font-bold text-gray-900 mt-1">{activeStat.title} · 历史变化</h2>
                    </div>
                  </div>
                  <div className="relative rounded-[1.75rem] bg-gradient-to-b from-slate-50 to-white border border-gray-100 px-4 py-4 overflow-hidden">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-400 mb-2">
                      <span>单位：{activeStat.unitName}</span>
                      <span>历史数据</span>
                    </div>
                    <div className="overflow-x-auto pb-2">
                      <div className="relative" style={{ width: `${chartSvgWidth}px` }}>
                        <svg
                          viewBox={`0 0 ${chartSvgWidth} ${chartHeight}`}
                          className="h-[220px] min-w-[720px]"
                          style={{ width: `${chartSvgWidth}px` }}
                        >
                          <defs>
                            <linearGradient id={lineGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor={activeStat.accent.line} />
                              <stop offset="100%" stopColor={activeStat.accent.week} />
                            </linearGradient>
                          </defs>
                          {yAxisValues.map((value) => {
                            const y =
                              chartPaddingTop +
                              (1 - value / yScaleMax) * chartPlotHeight;
                            return (
                              <g key={`tick-${value}`}>
                                <line
                                  x1={chartPaddingLeft}
                                  x2={chartSvgWidth - chartPaddingRight}
                                  y1={y}
                                  y2={y}
                                  stroke="#e5e7eb"
                                  strokeDasharray="4 6"
                                />
                                <text
                                  x={chartPaddingLeft - 12}
                                  y={y + 4}
                                  textAnchor="end"
                                  className="text-[10px] fill-gray-400 font-semibold"
                                >
                                  {formatYAxisValue(value)}
                                </text>
                              </g>
                            );
                          })}
                          <line
                            x1={chartPaddingLeft}
                            x2={chartSvgWidth - chartPaddingRight}
                            y1={chartBottom}
                            y2={chartBottom}
                            stroke="#e5e7eb"
                          />
                          <line
                            x1={chartPaddingLeft}
                            x2={chartPaddingLeft}
                            y1={chartPaddingTop}
                            y2={chartBottom}
                            stroke="#e5e7eb"
                          />
                          <path
                            d={linePath}
                            fill="none"
                            stroke={`url(#${lineGradientId})`}
                            strokeWidth="2.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {hoveredPoint && (
                            <>
                              <line
                                x1={hoveredPoint.x}
                                x2={hoveredPoint.x}
                                y1={chartPaddingTop}
                                y2={chartBottom}
                                stroke="#cbd5f5"
                                strokeDasharray="3 4"
                              />
                              <circle
                                cx={hoveredPoint.x}
                                cy={hoveredPoint.y}
                                r={4}
                                fill="#ffffff"
                                stroke={activeStat.accent.line}
                                strokeWidth="2"
                              />
                            </>
                          )}
                          {xAxisTicks.map(tick => {
                            const point = chartPoints[tick.index];
                            if (!point) return null;
                            return (
                              <text
                                key={`${activeStat.title}-tick-${tick.index}`}
                                x={point.x}
                                y={chartBottom + 22}
                                textAnchor="middle"
                                className="text-[10px] fill-gray-400 font-semibold"
                              >
                                {tick.label}
                              </text>
                            );
                          })}
                          <rect
                            x={chartPaddingLeft}
                            y={chartPaddingTop}
                            width={chartPlotWidth}
                            height={chartPlotHeight}
                            fill="transparent"
                            onMouseMove={(event) => {
                              if (!timelineLength) return;
                              const bounds = event.currentTarget.getBoundingClientRect();
                              const scaleX = chartSvgWidth / bounds.width;
                              const relativeX = (event.clientX - bounds.left) * scaleX;
                              const clampedX = Math.max(
                                chartPaddingLeft,
                                Math.min(chartSvgWidth - chartPaddingRight, relativeX)
                              );
                              const index = Math.round((clampedX - chartPaddingLeft) / step);
                              const safeIndex = Math.max(0, Math.min(timelineLength - 1, index));
                              setHoveredIndex(safeIndex);
                            }}
                            onMouseLeave={() => setHoveredIndex(null)}
                          />
                        </svg>
                        {hoveredPoint && hoveredDate && (
                          <div
                            className="absolute z-10 pointer-events-none bg-white border border-gray-100 shadow-xl rounded-xl px-4 py-3"
                            style={{ left: `${tooltipLeft}px`, top: `${tooltipTop}px`, width: `${tooltipWidth}px` }}
                          >
                            <div className="text-xs font-semibold text-gray-900">{formatFullDate(hoveredDate)}</div>
                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                              <span>{activeStat.title}</span>
                              <span className="font-bold text-gray-900">{formatTooltipValue(hoveredPoint.value)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FAQs (iOS 18 List Card) */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="font-bold text-gray-800 flex items-center gap-3 text-lg">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                           <MessageSquare size={20} />
                        </div>
                        读者常见问题
                    </h2>
                    <button className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">查看全部</button>
                </div>
                <div className="divide-y divide-gray-100/50">
                    {sortedQuestions.map(q => (
                        <div key={q.id} className="p-8 hover:bg-blue-50/30 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-4">
                                     <div className="bg-blue-100/80 text-blue-700 font-bold px-4 py-1.5 rounded-full text-xs border border-blue-200/50 shadow-sm flex items-center gap-1.5 min-w-[110px] justify-center backdrop-blur-sm">
                                        <HelpCircle size={14} />
                                        <span>{q.count} 提问</span>
                                     </div>
                                     <span className="text-xs font-medium text-gray-400">{q.timestamp}</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-50/80 px-3 py-1.5 rounded-lg border border-blue-100/50">
                                    {q.fileReference}
                                </span>
                            </div>
                            <p className="text-gray-800 mt-3 font-semibold text-xl leading-snug">{q.question}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      );
  };

  const EditorView = () => (
    <div className="flex h-full w-full relative">
         {/* Sub-Sidebar for Editor (File Tree) */}
        <aside className="w-72 border-r border-gray-200/60 bg-white flex flex-col shrink-0">
            <div className="p-5 border-b border-gray-200/60 flex items-center justify-between">
                <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">资源</h2>
                <div className="flex gap-2">
                   <button onClick={handleCreateFolder} className="p-2 hover:bg-blue-100 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"><FolderPlus size={18}/></button>
                   <button onClick={handleCreateDoc} className="p-2 hover:bg-blue-100 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"><FilePlus size={18}/></button>
                   <button onClick={handleUpload} className="p-2 hover:bg-blue-100 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"><Upload size={18}/></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto py-4 px-2">
                <FileTree 
                    files={files} 
                    selectedFileId={selectedFileId} 
                    onSelect={(node) => setSelectedFileId(node.id)} 
                    onToggleFolder={() => {}} 
                    theme="blue"
                />
            </div>
        </aside>

        {/* Main Editor Canvas */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
            {selectedFile ? (
            <>
                {/* Toolbar */}
                <div className="h-16 border-b border-gray-200/60 flex items-center justify-between px-8 bg-white/60 backdrop-blur-md shrink-0 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800 text-lg">{selectedFile.name}</span>
                        {selectedFile.publishConfig?.isPublished && (
                        <span className="px-3 py-1 bg-green-100/80 text-green-700 text-[10px] rounded-full font-bold uppercase tracking-wider">已发布</span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button onClick={handleSaveContent} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 px-4 py-2 rounded-full hover:bg-gray-100/80 transition-colors">
                            <Save size={18} /> 保存
                        </button>
                        <button 
                        onClick={() => setIsPublishModalOpen(true)}
                        className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
                        >
                            <Settings size={18} /> 发布
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                {selectedFile.type === 'text' ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <div className="flex-1 overflow-y-auto px-10 py-10">
                            <div className="max-w-3xl mx-auto space-y-6">
                                <div className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">正文</div>
                                <div className="rounded-[2rem] border border-gray-100 bg-white shadow-sm px-6 py-6">
                                    {editor ? (
                                      <EditorContent editor={editor} />
                                    ) : (
                                      <div className="text-sm text-gray-400">正在加载编辑器...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-10 py-4 border-t border-gray-100 text-[11px] text-gray-400 bg-white/60">
                            输入“/”可唤起模块菜单（原型占位）
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <div className="bg-gray-50 p-6 rounded-[2rem]">
                            <Eye size={48} className="mb-4 text-gray-300" />
                        </div>
                        <p className="mt-4 font-medium">{selectedFile.type} 类型暂不支持在编辑器中预览。</p>
                    </div>
                )}
            </>
            ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-blue-50/10">
                <div className="w-24 h-24 bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex items-center justify-center mb-6">
                   <FilePlus size={40} className="text-blue-300" />
                </div>
                <p className="font-bold text-lg text-gray-500">从左侧栏选择一个文件进行编辑。</p>
            </div>
            )}
        </main>

        {/* Right Drawer: Project Settings */}
        <aside
            className={`
                shrink-0 overflow-hidden border-l border-indigo-100/60 bg-white/70 backdrop-blur-xl
                transition-[width,transform,opacity] duration-500 ease-out
                ${isSettingsOpen ? 'w-[22rem] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-6 pointer-events-none'}
            `}
        >
            <div className="w-[22rem] h-full flex flex-col">
                <div className="px-6 py-5 border-b border-indigo-100/60 flex items-center justify-between bg-white/60">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Settings size={16} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-gray-800">项目设置</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Project</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
                    {!activeProjectSettings ? (
                        <div className="text-sm text-gray-400 font-medium">请先选择一个项目。</div>
                    ) : (
                        <>
                            <section className="space-y-4">
                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">基本信息</h4>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">项目名称</label>
                                        <input
                                            value={activeProjectSettings.title}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const title = e.target.value;
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], title }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-semibold text-gray-800"
                                            placeholder="请输入项目名称"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">项目简介</label>
                                        <textarea
                                            value={activeProjectSettings.description}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const description = e.target.value;
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], description }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-800 text-sm min-h-[96px] resize-none"
                                            placeholder="一句话描述你的项目"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">封面图（URL）</label>
                                        <input
                                            value={activeProjectSettings.coverUrl}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const coverUrl = e.target.value;
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], coverUrl }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-800"
                                            placeholder="https://..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">标签</label>
                                        <input
                                            value={activeProjectSettings.tags}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const tags = e.target.value;
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], tags }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all text-gray-800"
                                            placeholder="如：设计、增长、AI"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">发布状态</h4>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                          if (!selectedProjectId) return;
                                          setProjectSettingsById(prev => ({
                                            ...prev,
                                            [selectedProjectId]: { ...prev[selectedProjectId], status: 'draft' }
                                          }));
                                        }}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition-all ${
                                          activeProjectSettings.status === 'draft'
                                            ? 'bg-gray-900 text-white border-gray-900'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        草稿
                                    </button>
                                    <button
                                        onClick={() => {
                                          if (!selectedProjectId) return;
                                          setProjectSettingsById(prev => ({
                                            ...prev,
                                            [selectedProjectId]: { ...prev[selectedProjectId], status: 'published' }
                                          }));
                                        }}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition-all ${
                                          activeProjectSettings.status === 'published'
                                            ? 'bg-green-600 text-white border-green-600'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        已发布
                                    </button>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">定价（积分）</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">文本阅读</label>
                                        <input
                                            type="number"
                                            value={activeProjectSettings.textCost}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const textCost = Number(e.target.value);
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], textCost }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-semibold text-gray-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-600">AI 语音</label>
                                        <input
                                            type="number"
                                            value={activeProjectSettings.audioCost}
                                            onChange={(e) => {
                                              if (!selectedProjectId) return;
                                              const audioCost = Number(e.target.value);
                                              setProjectSettingsById(prev => ({
                                                ...prev,
                                                [selectedProjectId]: { ...prev[selectedProjectId], audioCost }
                                              }));
                                            }}
                                            className="mt-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 outline-none transition-all font-semibold text-gray-800"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="space-y-4">
                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">内容权限</h4>
                                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeProjectSettings.permissions.allowCopy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                            {activeProjectSettings.permissions.allowCopy ? <Check size={16} /> : <Lock size={16} />}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">允许复制</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={activeProjectSettings.permissions.allowCopy}
                                        onChange={(e) => {
                                          if (!selectedProjectId) return;
                                          const allowCopy = e.target.checked;
                                          setProjectSettingsById(prev => ({
                                            ...prev,
                                            [selectedProjectId]: {
                                              ...prev[selectedProjectId],
                                              permissions: { ...prev[selectedProjectId].permissions, allowCopy }
                                            }
                                          }));
                                        }}
                                        className="w-5 h-5 accent-blue-600"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeProjectSettings.permissions.allowDownload ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>
                                            {activeProjectSettings.permissions.allowDownload ? <Check size={16} /> : <Lock size={16} />}
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">允许下载</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={activeProjectSettings.permissions.allowDownload}
                                        onChange={(e) => {
                                          if (!selectedProjectId) return;
                                          const allowDownload = e.target.checked;
                                          setProjectSettingsById(prev => ({
                                            ...prev,
                                            [selectedProjectId]: {
                                              ...prev[selectedProjectId],
                                              permissions: { ...prev[selectedProjectId].permissions, allowDownload }
                                            }
                                          }));
                                        }}
                                        className="w-5 h-5 accent-blue-600"
                                    />
                                </label>
                                <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${activeProjectSettings.permissions.watermark ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                            <ShieldAlert size={16} />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">水印保护</span>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={activeProjectSettings.permissions.watermark}
                                        onChange={(e) => {
                                          if (!selectedProjectId) return;
                                          const watermark = e.target.checked;
                                          setProjectSettingsById(prev => ({
                                            ...prev,
                                            [selectedProjectId]: {
                                              ...prev[selectedProjectId],
                                              permissions: { ...prev[selectedProjectId].permissions, watermark }
                                            }
                                          }));
                                        }}
                                        className="w-5 h-5 accent-blue-600"
                                    />
                                </label>
                            </section>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-indigo-100/60 bg-white/70">
                    <button
                        onClick={handleSaveProjectSettings}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-blue-500 text-white text-sm font-bold shadow-lg shadow-indigo-200/60 hover:shadow-xl hover:shadow-indigo-300/60 transition-all active:scale-95"
                    >
                        保存设置
                    </button>
                </div>
            </div>
        </aside>

        {!isSettingsOpen && (
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-24 right-4 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-md text-indigo-600 text-xs font-bold hover:bg-indigo-50 transition-colors"
            >
                项目设置
            </button>
        )}

        {/* iOS 18 Style Modal */}
        {isPublishModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm">
                <div className="bg-white/90 backdrop-blur-2xl w-full max-w-lg rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden animate-fadeIn scale-100 ring-1 ring-white/50">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white/50">
                    <h3 className="font-bold text-xl text-gray-900 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            <Settings size={22} />
                        </div>
                        发布设置
                    </h3>
                    <button onClick={() => setIsPublishModalOpen(false)} className="bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                    </div>
                    
                    <div className="p-8 space-y-8">
                    {/* Pricing */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <DollarSign size={14} /> 定价 (积分)
                        </h4>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2 group">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors"><Type size={16} /> 文本阅读</label>
                                <input type="number" value={tempPublishConfig.textCost} onChange={(e) => setTempPublishConfig({...tempPublishConfig, textCost: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-semibold text-gray-800" />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-sm font-bold text-gray-700 flex items-center gap-2 group-hover:text-blue-600 transition-colors"><Mic size={16} /> AI 语音</label>
                                <input type="number" value={tempPublishConfig.audioCost} onChange={(e) => setTempPublishConfig({...tempPublishConfig, audioCost: Number(e.target.value)})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all font-semibold text-gray-800" />
                            </div>
                        </div>
                    </div>
                    <div className="h-px bg-gray-100" />
                    {/* Privacy */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ShieldAlert size={14} /> 隐私与版权</h4>
                        <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-all hover:scale-[1.02] shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${tempPublishConfig.permissions.allowCopy ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{tempPublishConfig.permissions.allowCopy ? <Check size={16} /> : <Lock size={16} />}</div>
                                <span className="font-bold text-gray-700">允许复制文本</span>
                            </div>
                            <input type="checkbox" checked={tempPublishConfig.permissions.allowCopy} onChange={(e) => setTempPublishConfig({...tempPublishConfig, permissions: { ...tempPublishConfig.permissions, allowCopy: e.target.checked }})} className="w-6 h-6 accent-blue-600 rounded-md" />
                        </label>
                        <label className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-all hover:scale-[1.02] shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`p-2 rounded-full ${tempPublishConfig.permissions.allowDownload ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'}`}>{tempPublishConfig.permissions.allowDownload ? <Check size={16} /> : <Lock size={16} />}</div>
                                <span className="font-bold text-gray-700">允许下载</span>
                            </div>
                            <input type="checkbox" checked={tempPublishConfig.permissions.allowDownload} onChange={(e) => setTempPublishConfig({...tempPublishConfig, permissions: { ...tempPublishConfig.permissions, allowDownload: e.target.checked }})} className="w-6 h-6 accent-blue-600 rounded-md" />
                        </label>
                    </div>
                    </div>

                    <div className="p-8 border-t border-gray-100 bg-gray-50/80 flex justify-end gap-4">
                        <button onClick={() => setIsPublishModalOpen(false)} className="px-6 py-3 text-gray-600 font-bold hover:text-gray-900 text-sm hover:bg-gray-200/50 rounded-full transition-colors">取消</button>
                        <button onClick={handlePublish} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95">发布内容</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );

  return (
    <div className="flex h-full bg-white">
      {/* Main Left Navigation Bar */}
      <nav className="w-24 bg-white border-r border-gray-100 flex flex-col items-center py-8 gap-8 shrink-0 z-20 shadow-sm">
         <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 mb-2">
             <Layout size={26} />
         </div>
         
         <div className="flex flex-col w-full gap-4 px-4 flex-1">
            <button 
                onClick={() => setCurrentView('projects')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl transition-all duration-300 ${currentView === 'projects' || currentView === 'editor' ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:shadow-sm'}`}
            >
                <Briefcase size={22} />
                <span className="text-[10px] font-bold">项目</span>
            </button>
            <button 
                onClick={() => setCurrentView('analytics')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-3xl transition-all duration-300 ${currentView === 'analytics' ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:shadow-sm'}`}
            >
                <BarChart2 size={22} />
                <span className="text-[10px] font-bold">数据</span>
            </button>
         </div>

         {/* Exit Studio Button */}
         <div className="px-4 w-full">
            <button 
                onClick={onExitStudio}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-3xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300 w-full hover:shadow-sm"
                title="退出工作室"
            >
                <LogOut size={22} />
                <span className="text-[10px] font-bold">退出</span>
            </button>
         </div>
      </nav>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden relative bg-slate-50">
          <div className="relative z-10 w-full h-full flex flex-col">
            {currentView === 'projects' && <ProjectsView />}
            {currentView === 'analytics' && <AnalyticsView />}
            {currentView === 'editor' && <EditorView />}
          </div>
      </div>
    </div>
  );
};

export default CreatorStudio;





