import React, { useState } from 'react';
import { FileText, Network, PanelRightClose, Bot, ArrowUp, Radio, Presentation, ClipboardCheck, Grid3x3 } from 'lucide-react';

interface RightToolbarProps {
  isChatOpen: boolean;
  onToggleChat: () => void;
  onSummary: () => void;
  onMindMap: () => void;
  onPodcast?: () => void;
  onPPT?: () => void;
  onQuiz?: () => void;
  className?: string;
}

const RightToolbar: React.FC<RightToolbarProps> = ({ 
  isChatOpen, 
  onToggleChat, 
  onSummary, 
  onMindMap,
  onPodcast,
  onPPT,
  onQuiz,
  className = ""
}) => {
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [shouldRenderMenu, setShouldRenderMenu] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleScrollTop = () => {
    const container = document.getElementById('content-viewer-container');
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 收集所有可用的工具
  const availableTools = [
    { name: '思维导图', icon: Network, color: 'emerald', onClick: onMindMap },
    ...(onPodcast ? [{ name: 'AI 播客', icon: Radio, color: 'orange', onClick: onPodcast }] : []),
    ...(onPPT ? [{ name: 'AI PPT', icon: Presentation, color: 'pink', onClick: onPPT }] : []),
    ...(onQuiz ? [{ name: 'AI 测验', icon: ClipboardCheck, color: 'cyan', onClick: onQuiz }] : []),
  ];

  return (
    <div className={`flex flex-col gap-5 ${className}`}>
       {/* AI Chat Toggle */}
       <div className="flex flex-col items-center gap-1.5">
          <button 
            onClick={onToggleChat}
            className={`
              w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:scale-110 active:scale-95 border border-gray-200/60 backdrop-blur-xl
              ${isChatOpen 
                ? 'bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)] ring-2 ring-sky-100/50' 
                : 'bg-white/90 text-gray-600 hover:text-sky-600 hover:bg-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
              }
            `}
          >
            {isChatOpen ? <PanelRightClose size={22} /> : <Bot size={22} />}
          </button>
          <span className="text-[10px] font-semibold text-gray-700 whitespace-nowrap">
            {isChatOpen ? '关闭' : '问问 AI'}
          </span>
       </div>

       {/* Tools Separator */}
       <div className="h-px w-8 bg-gray-200/40 mx-auto my-1" />

       {/* Summary Tool */}
       <div className="flex flex-col items-center gap-1.5">
            <button 
                onClick={onSummary}
                className="w-12 h-12 rounded-2xl bg-white/90 text-purple-500 hover:bg-white hover:text-purple-600 hover:scale-110 border border-gray-200/60 flex items-center justify-center transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(168,85,247,0.15)] active:scale-95 backdrop-blur-sm"
            >
                <FileText size={20} />
            </button>
            <span className="text-[10px] font-semibold text-gray-700 whitespace-nowrap">AI 总结</span>
       </div>

       {/* AI 工具聚合按钮 */}
       {availableTools.length > 0 && (
           <div 
               className="relative flex flex-col items-center gap-1.5"
               onMouseEnter={() => {
                 setIsClosing(false);
                 setShouldRenderMenu(true);
                 // 使用双重 requestAnimationFrame 确保 DOM 更新后再触发动画
                 requestAnimationFrame(() => {
                   requestAnimationFrame(() => {
                     setIsToolsMenuOpen(true);
                   });
                 });
               }}
               onMouseLeave={() => {
                 setIsClosing(true);
                 setIsToolsMenuOpen(false);
                 // 延迟移除元素，让淡出动画完成
                 setTimeout(() => {
                   setShouldRenderMenu(false);
                   setIsClosing(false);
                 }, 200);
               }}
           >
                <button 
                    className="w-12 h-12 rounded-2xl bg-white/90 text-indigo-500 hover:bg-white hover:text-indigo-600 hover:scale-110 border border-gray-200/60 flex items-center justify-center transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(99,102,241,0.15)] active:scale-95 backdrop-blur-sm"
                >
                    <Grid3x3 size={20} />
                </button>
                <span className="text-[10px] font-semibold text-gray-700 whitespace-nowrap">AI 工具</span>
                
                {/* 展开的工具列表 */}
                {shouldRenderMenu && (
                    <>
                        {/* 不可见的连接区域，确保鼠标移动顺畅 */}
                        <div className="absolute right-full top-0 w-2 h-12 z-40" />
                        <div 
                            className={`absolute right-full mr-1 top-0 flex flex-col gap-1.5 p-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-gray-200/60 z-50 min-w-[140px] ${
                                isToolsMenuOpen 
                                    ? 'opacity-100 translate-x-0 scale-100' 
                                    : isClosing
                                    ? 'opacity-0 translate-x-0 scale-100 pointer-events-none'
                                    : 'opacity-0 translate-x-16 scale-90 pointer-events-none'
                            }`}
                            style={{
                                transition: isToolsMenuOpen 
                                    ? 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                                    : isClosing
                                    ? 'opacity 0.2s ease-out'
                                    : 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }}
                        >
                            {availableTools.map((tool, index) => {
                                const Icon = tool.icon;
                                const colorClasses = {
                                    emerald: 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/80',
                                    orange: 'text-orange-600 hover:text-orange-700 hover:bg-orange-50/80',
                                    pink: 'text-pink-600 hover:text-pink-700 hover:bg-pink-50/80',
                                    cyan: 'text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50/80',
                                };
                                return (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            tool.onClick?.();
                                            setIsToolsMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${colorClasses[tool.color as keyof typeof colorClasses]} active:scale-95`}
                                    >
                                        <Icon size={16} />
                                        <span className="text-xs font-semibold">{tool.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
           </div>
       )}

       {/* Scroll to Top - 保持原样，只有悬停提示 */}
       <div className="relative group">
            <button 
                onClick={handleScrollTop}
                className="w-12 h-12 rounded-2xl bg-white/90 text-gray-500 hover:bg-white hover:text-gray-700 hover:scale-110 border border-gray-200/60 flex items-center justify-center transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:scale-95 backdrop-blur-sm"
            >
                <ArrowUp size={20} />
            </button>
             <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-3 py-1.5 bg-gray-900/85 backdrop-blur-xl text-white text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-50 shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                回到顶部
            </div>
       </div>
    </div>
  );
};

export default RightToolbar;