import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FileTree from './components/FileTree';
import ContentViewer from './components/ContentViewer';
import AIChat from './components/AIChat';
import RightToolbar from './components/RightToolbar';
import UserProfilePage from './components/UserProfilePage';
import CreatorPublicProfile from './components/CreatorPublicProfile';
import CreatorStudio from './components/CreatorStudio';
import { MOCK_FILES, CURRENT_USER, PURCHASED_ITEMS, MOCK_CREATOR, MOCK_PROJECTS } from './constants';
import { FileNode } from './types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

function App() {
  // Global App Mode: 'reader' (Learner) or 'creator' (Sharer)
  const getInitialMode = (): 'reader' | 'creator' => {
    if (typeof window === 'undefined') return 'reader';
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'creator' ? 'creator' : 'reader';
  };
  const [appMode, setAppMode] = useState<'reader' | 'creator'>(() => getInitialMode());
  
  // Reader Mode States
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [readerView, setReaderView] = useState<'dashboard' | 'userProfile' | 'creatorProfile'>('dashboard');
  
  // TOC / Outline States
  const [headings, setHeadings] = useState<{id: string, text: string, level: number}[]>([]);
  const [showOutlinePopover, setShowOutlinePopover] = useState(false);

  // Helper to find first available file for default selection
  const findFirstFileId = (nodes: FileNode[]): string | null => {
    for (const node of nodes) {
      if (node.type !== 'folder') return node.id;
      if (node.children) {
        const found = findFirstFileId(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Data States
  const [files, setFiles] = useState(MOCK_FILES); // Reader files
  const [creatorFiles, setCreatorFiles] = useState<FileNode[]>(MOCK_FILES); // Creator personal files
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => findFirstFileId(MOCK_FILES));

  // Helper to find file by ID (recursive)
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

  const handleToggleFolder = (id: string) => {
    const toggleNode = (nodes: FileNode[]): FileNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNode(node.children) };
        }
        return node;
      });
    };
    setFiles(toggleNode(files));
  };

  // --- TOC Parsing Logic ---
  useEffect(() => {
    if (selectedFile?.type === 'text' && selectedFile.content) {
      const extracted: {id: string, text: string, level: number}[] = [];
      const lines = selectedFile.content.split('\n');
      lines.forEach((line, index) => {
        // Match # Heading, ## Heading, etc.
        const match = line.match(/^(#{1,3})\s+(.+)$/);
        if (match) {
          extracted.push({
            id: `heading-${index}`, // Matches ID generation in ContentViewer
            level: match[1].length,
            text: match[2].trim()
          });
        }
      });
      setHeadings(extracted);
    } else {
      setHeadings([]);
    }
  }, [selectedFile]);

  const handleScrollToHeading = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Placeholder actions
  const handleAISummary = () => alert("AI 摘要生成中... (演示)");
  const handleAIMindMap = () => alert("正在生成思维导图... (演示)");
  const handleAIPodcast = () => alert("正在生成播客... (演示)");

  return (
    <div className="flex flex-col h-screen text-gray-800 bg-white">
      <Header 
        appMode={appMode}
        user={CURRENT_USER}
        onUserClick={() => {
            setAppMode('reader');
            setReaderView('userProfile');
        }}
        creatorProfile={MOCK_CREATOR}
        knowledgeTitle={MOCK_CREATOR.knowledgeBaseName}
      />

      {/* Main Layout */}
      <main className={`flex-1 flex overflow-hidden relative ${appMode === 'creator' ? '' : 'p-4 gap-6'}`}>
        
        {appMode === 'creator' ? (
            <div className="w-full h-full animate-fadeIn overflow-hidden">
                <CreatorStudio 
                    files={creatorFiles}
                    setFiles={setCreatorFiles}
                    onExitStudio={() => setAppMode('reader')}
                />
            </div>
        ) : (
            <>
                {/* 
                  LEFT SIDEBAR - SILKY SMOOTH ANIMATION 
                  Technique: cubic-bezier easing + Fixed Inner Width Container
                */}
                {readerView === 'dashboard' && (
                <aside 
                    className={`
                    flex flex-col z-30
                    bg-gray-50 border-r border-gray-200/50 shadow-none
                    rounded-[2.5rem] overflow-hidden shrink-0
                    transition-[width,transform,opacity,margin] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${isLeftSidebarOpen 
                        ? 'w-80 opacity-100 translate-x-0' 
                        : 'w-0 opacity-0 -translate-x-10'
                    }
                    `}
                >
                    {/* Fixed Width Inner Container (Prevents content squashing) */}
                    <div className="w-80 h-full flex flex-col min-w-[20rem]">
                        
                        {/* Sidebar Header */}
                        <div className="h-[88px] px-6 border-b border-gray-200/50 flex items-center justify-between shrink-0 bg-gray-50 pt-2">
                            <div className="flex-1 min-w-0 flex flex-col justify-center mr-2">
                                <div className="mb-1">
                                    <h2 className="text-base font-extrabold text-gray-900 leading-tight truncate" title={MOCK_CREATOR.knowledgeBaseName}>
                                        {MOCK_CREATOR.knowledgeBaseName}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="flex items-center gap-2 cursor-pointer group"
                                        onClick={() => setReaderView('creatorProfile')}
                                    >
                                        <img src={MOCK_CREATOR.avatar} alt={MOCK_CREATOR.name} className="w-5 h-5 rounded-full border border-gray-100 group-hover:border-blue-300 transition-colors shrink-0 object-cover" />
                                        <span className="text-xs font-medium text-gray-500 group-hover:text-blue-600 transition-colors truncate max-w-[150px]">
                                            {MOCK_CREATOR.name}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsLeftSidebarOpen(false)} 
                                className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-white/80 transition-colors -mr-2 shrink-0 self-center"
                            >
                                <PanelLeftClose size={20} />
                            </button>
                        </div>
                        
                        {/* File Tree */}
                        <div className="flex-1 flex overflow-hidden relative">
                            <div className="flex-1 overflow-y-auto py-4 px-2 no-scrollbar">
                                <FileTree 
                                    files={files} 
                                    selectedFileId={selectedFileId} 
                                    onSelect={(node) => setSelectedFileId(node.id)} 
                                    onToggleFolder={handleToggleFolder} 
                                    theme="blue"
                                />
                            </div>
                        </div>
                    </div>
                </aside>
                )}

                {/* CENTER CONTENT SECTION */}
                <section className="flex-1 flex flex-col min-w-0 relative h-full items-center justify-center transition-all duration-500 ease-out">
                    
                    {/* Floating Sidebar Toggle (When closed) */}
                    {readerView === 'dashboard' && !isLeftSidebarOpen && (
                        <div className="absolute top-4 left-4 z-50 animate-in fade-in zoom-in duration-300">
                             <button 
                                onClick={() => setIsLeftSidebarOpen(true)}
                                className="p-3 bg-white border border-gray-200 shadow-sm rounded-2xl text-gray-500 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all"
                                title="打开侧边栏"
                            >
                                <PanelLeftOpen size={20} />
                            </button>
                        </div>
                    )}

                    {readerView === 'dashboard' ? (
                        <div 
                            className={`
                                relative h-full flex flex-col transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                                ${isLeftSidebarOpen && isRightSidebarOpen ? 'w-full max-w-4xl' : isLeftSidebarOpen ? 'w-full max-w-5xl' : isRightSidebarOpen ? 'w-full max-w-5xl' : 'w-full max-w-6xl'}
                            `}
                        >
                            {/* Main Content Area */}
                            <div className="flex-1 h-full bg-white transition-all duration-500 relative">
                                <ContentViewer file={selectedFile} />
                                
                                {/* TOC - 相对于内容区域定位 */}
                                {headings.length > 0 && !isLeftSidebarOpen && (
                                    <div className="absolute -left-4 top-0 h-full flex flex-col items-center justify-center z-20 pointer-events-none animate-fadeIn">
                                        <div 
                                            className="relative pointer-events-auto"
                                            onMouseEnter={() => setShowOutlinePopover(true)}
                                            onMouseLeave={() => setShowOutlinePopover(false)}
                                        >
                                            {/* 
                                                The Popover Window (White + Shadow) 
                                            */}
                                            <div 
                                                className={`
                                                    absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64
                                                    bg-white border border-gray-100 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.15)]
                                                    rounded-2xl p-5
                                                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] origin-left z-50
                                                    ${showOutlinePopover 
                                                        ? 'opacity-100 translate-x-0 scale-100 visible' 
                                                        : 'opacity-0 -translate-x-4 scale-95 invisible'
                                                    }
                                                `}
                                            >
                                                <h4 className="text-xs font-extrabold text-gray-400 uppercase tracking-widest mb-4">目录</h4>
                                                <div className="space-y-1 max-h-[60vh] overflow-y-auto no-scrollbar">
                                                    {headings.map(h => (
                                                        <button 
                                                            key={h.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleScrollToHeading(h.id);
                                                                setShowOutlinePopover(false);
                                                            }}
                                                            className={`
                                                                block w-full text-left text-sm py-1.5 px-3 rounded-lg transition-colors truncate border border-transparent
                                                                ${h.level === 1 ? 'font-bold text-gray-900 hover:bg-gray-50' : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50'}
                                                                ${h.level === 2 ? 'pl-4 text-[13px]' : ''}
                                                                ${h.level >= 3 ? 'pl-7 text-xs' : ''}
                                                            `}
                                                        >
                                                            {h.text}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 
                                                The Lines Strip (Static Appearance) 
                                            */}
                                            <div className="flex flex-col gap-3 py-12 px-8 -mr-4 cursor-pointer">
                                                {headings.map((h) => (
                                                    <div 
                                                        key={h.id} 
                                                        className="flex justify-end items-center h-2"
                                                        onClick={() => handleScrollToHeading(h.id)}
                                                    >
                                                        <div className={`
                                                            rounded-full h-[3px] shadow-sm
                                                            ${h.level === 1 ? 'w-10 bg-slate-300' : ''}
                                                            ${h.level === 2 ? 'w-6 bg-slate-200' : ''}
                                                            ${h.level >= 3 ? 'w-3 bg-slate-100' : ''}
                                                        `} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Right Toolbar - 相对于内容区域定位 */}
                                {!isRightSidebarOpen && (
                                    <div className="absolute -right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:block animate-fadeIn">
                                        <RightToolbar 
                                            isChatOpen={isRightSidebarOpen}
                                            onToggleChat={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
                                            onSummary={handleAISummary}
                                            onMindMap={handleAIMindMap}
                                            onPodcast={handleAIPodcast}
                                        />
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : readerView === 'creatorProfile' ? (
                        <div className="w-full h-full bg-white">
                            <CreatorPublicProfile 
                                creator={MOCK_CREATOR}
                                projects={MOCK_PROJECTS}
                                onBack={() => setReaderView('dashboard')}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-white">
                            <UserProfilePage 
                                user={CURRENT_USER}
                                items={PURCHASED_ITEMS}
                                onBack={() => setReaderView('dashboard')}
                                onSelectKnowledge={() => setReaderView('dashboard')}
                                onSwitchToCreator={() => {
                                  const url = new URL(window.location.href);
                                  url.searchParams.set('mode', 'creator');
                                  window.open(url.toString(), '_blank', 'noopener,noreferrer');
                                }}
                            />
                        </div>
                    )}
                </section>
                
                {/* RIGHT SIDEBAR - AI Chat */}
                {readerView === 'dashboard' && (
                    <aside 
                        className={`
                        flex flex-col z-30
                        bg-white border-l border-gray-200/60
                        rounded-[15px] overflow-hidden shrink-0
                        transition-[width,transform,opacity,margin,box-shadow] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]
                        ${isRightSidebarOpen 
                            ? 'w-[28rem] opacity-100 translate-x-0 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)]' 
                            : 'w-0 opacity-0 translate-x-10 shadow-none'
                        }
                        `}
                    >
                        {/* Fixed Width Inner Container */}
                        <div className="w-[28rem] h-full flex flex-col min-w-[28rem] bg-gradient-to-b from-white to-gray-50/30">
                            <AIChat 
                                currentFile={selectedFile} 
                                fileTreeData={files} 
                                onClose={() => setIsRightSidebarOpen(false)}
                                onNavigateToFile={(id) => setSelectedFileId(id)}
                                isOpen={isRightSidebarOpen}
                                onSummary={handleAISummary}
                                onMindMap={handleAIMindMap}
                                onPodcast={handleAIPodcast}
                            />
                        </div>
                    </aside>
                )}
            </>
        )}
      </main>
    </div>
  );
}

export default App;
