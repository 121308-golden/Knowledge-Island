import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, FileNode } from '../types';
import { Send, Mic, Volume2, Loader2, X, Link as LinkIcon, Bot, File, Search, FileText, Network, Radio, AtSign, Folder, Presentation, ClipboardCheck } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../services/liveApiUtils';

interface AIChatProps {
  currentFile: FileNode | null;
  fileTreeData: FileNode[];
  onClose: () => void;
  onNavigateToFile: (fileId: string) => void;
  isOpen: boolean;
  onSummary?: () => void;
  onMindMap?: () => void;
  onPodcast?: () => void;
  onPPT?: () => void;
  onQuiz?: () => void;
}

// --------------------------------------------------------
// LIVE API HOOK (Unchanged logic, kept for context)
// --------------------------------------------------------
const useLiveSession = (
  isActive: boolean, 
  onDisconnect: () => void,
  systemInstruction: string
) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Refs for audio handling
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null); // To hold the active session

  useEffect(() => {
    if (!isActive) {
      // Cleanup when inactive
      sessionRef.current = null;
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      return;
    }

    const startSession = async () => {
      setIsConnecting(true);
      try {
        const apiKey = process.env.API_KEY || '';
        if (!apiKey) {
            console.error("No API KEY");
            onDisconnect();
            return;
        }

        const ai = new GoogleGenAI({ apiKey });
        
        // Setup Audio Contexts
        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outputAudioContext;

        const outputNode = outputAudioContext.createGain();
        outputNode.connect(outputAudioContext.destination);

        // Get Mic Stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Connect to Gemini Live
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
            systemInstruction: systemInstruction,
          },
          callbacks: {
            onopen: () => {
              console.log('Gemini Live Connected');
              setIsConnecting(false);
              
              // Setup Audio Processing for Input
              const source = inputAudioContext.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => {
                   session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContext.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              // Handle Audio Output
              const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64Audio) {
                setIsPlaying(true);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                
                const audioBuffer = await decodeAudioData(
                  decode(base64Audio),
                  outputAudioContext,
                  24000,
                  1
                );
                
                const source = outputAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputNode);
                
                source.addEventListener('ended', () => {
                   sourcesRef.current.delete(source);
                   if(sourcesRef.current.size === 0) setIsPlaying(false);
                });

                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
              }

              // Handle Interruption
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsPlaying(false);
              }
            },
            onclose: () => {
              console.log('Session closed');
              onDisconnect();
            },
            onerror: (err) => {
              console.error('Session error', err);
              onDisconnect();
            }
          }
        });

        sessionRef.current = sessionPromise;

      } catch (err) {
        console.error("Failed to connect live session", err);
        setIsConnecting(false);
        onDisconnect();
      }
    };

    startSession();
    
    // Cleanup hook
    return () => {
        // We handle cleanup in the effect dependencies or isActive check mostly,
        // but explicit cleanup is good.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return { isConnecting, isPlaying };
};


// --------------------------------------------------------
// COMPONENT
// --------------------------------------------------------

const AIChat: React.FC<AIChatProps> = ({ currentFile, fileTreeData, onClose, onNavigateToFile, isOpen, onSummary, onMindMap, onPodcast, onPPT, onQuiz }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: '1', 
      role: 'model', 
      text: '你好！我是你的 AI 助手，有什么可以帮你的吗？', 
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileNode[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [typingText, setTypingText] = useState('');
  const [currentTypingMessageId, setCurrentTypingMessageId] = useState<string | null>(null);
  const [hoveredCitationIndex, setHoveredCitationIndex] = useState<number | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<number | null>(null);

  // 当 currentFile 变化时，更新选中的文件列表
  useEffect(() => {
    if (currentFile && !selectedFiles.find(f => f.id === currentFile.id)) {
      setSelectedFiles([currentFile]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile?.id]);

  // Monitor visibility to stop voice mode
  useEffect(() => {
    if (!isOpen) {
      setIsVoiceMode(false);
    }
  }, [isOpen]);

  // Helper: recursively find file by name
  const findFileByName = (nodes: FileNode[], name: string): FileNode | null => {
    for (const node of nodes) {
      if (node.name === name) return node;
      if (node.children) {
        const found = findFileByName(node.children, name);
        if (found) return found;
      }
    }
    return null;
  };

  // Generate context string
  const getContext = () => {
    let context = `你是一位创作者知识库的智能助手。请使用中文回答。 \n`;
    context += `重要指令：提供完整、自然的回答。当你的回答引用知识库中的特定内容时，请在相关句子或短语末尾添加引用，格式为双括号包裹文件名和引用的文本片段，例如：[[第1章 考研英语全景解析.md:英一的文章多选自学术期刊，词汇更难、句子更复杂，要求5500+词汇量]]。\n\n`;
    
    if (selectedFiles.length > 0) {
      context += `用户正在基于以下文件进行对话：\n`;
      selectedFiles.forEach((file) => {
        context += `- "${file.name}" (类型: ${file.type})\n`;
        if (file.content && file.type === 'text') {
          context += `  文件内容:\n${file.content}\n\n`;
        }
      });
    } else if (currentFile) {
      context += `用户当前正在查看文件： "${currentFile.name}" (类型: ${currentFile.type}).\n`;
      if (currentFile.content && currentFile.type === 'text') {
        context += `文件内容:\n${currentFile.content}\n\n`;
      }
    }
    context += `文件结构:\n${JSON.stringify(fileTreeData.map(f => ({name: f.name, type: f.type})), null, 2)}`;
    return context;
  };

  // 移除文件扩展名
  const removeExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    return fileName.substring(0, lastDotIndex);
  };

  // Parse text to render citations
  const renderMessageText = (text: string, messageId: string) => {
    // Regex to match [[FileName:CitationText]] or [[FileName]]
    const parts = text.split(/(\[\[.*?\]\])/g);
    let citationIndex = 0;
    
    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const content = part.slice(2, -2);
        // 检查是否包含冒号（新格式：文件名:引用文本）
        const colonIndex = content.indexOf(':');
        let fileName: string;
        let citationText: string | null = null;
        
        if (colonIndex > 0) {
          fileName = content.substring(0, colonIndex);
          citationText = content.substring(colonIndex + 1);
        } else {
          fileName = content;
        }
        
        const fileNode = findFileByName(fileTreeData, fileName);
        citationIndex++;
        const currentCitationIndex = citationIndex;
        const uniqueKey = `${messageId}-citation-${currentCitationIndex}`;
        const displayName = removeExtension(fileName);
        const isHovered = hoveredCitationIndex === currentCitationIndex;
        
        if (fileNode) {
          return (
            <span key={index} className="inline-flex items-center align-baseline relative mx-0.5">
              {/* 引用符号 - 默认显示 */}
              <button 
                onMouseEnter={() => setHoveredCitationIndex(currentCitationIndex)}
                onMouseLeave={() => setHoveredCitationIndex(null)}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('引用按钮被点击:', { 
                    fileId: fileNode.id, 
                    fileName: fileNode.name,
                    citationText: citationText,
                    hasCitationText: !!citationText
                  });
                  
                  // 如果有关联的引用文本，触发跳转和高亮事件
                  if (citationText) {
                    // 触发自定义事件，传递文件ID和引用文本
                    // App.tsx 会处理文件切换和高亮
                    const event = new CustomEvent('navigateToCitation', {
                      detail: { fileId: fileNode.id, citationText: citationText.trim() }
                    });
                    console.log('触发 navigateToCitation 事件:', event.detail);
                    window.dispatchEvent(event);
                  } else {
                    // 如果没有引用文本，只切换文件
                    onNavigateToFile(fileNode.id);
                  }
                }}
                className="citation-button inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 transition-all text-[11px] font-bold cursor-pointer hover:scale-110 active:scale-95 border border-sky-200/60 hover:border-sky-300 shadow-sm hover:shadow-md"
                title={citationText ? `${displayName}: ${citationText.substring(0, 30)}${citationText.length > 30 ? '...' : ''}` : displayName}
              >
                {currentCitationIndex}
              </button>
              
              {/* 悬停时显示的文件名和引用文本提示 - 只有当前悬停的引用才显示 */}
              {isHovered && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-1.5 bg-gray-900/95 text-white text-xs font-medium rounded-lg max-w-xs pointer-events-none z-50 backdrop-blur-sm shadow-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="font-bold">{displayName}</div>
                  {citationText && (
                    <div className="mt-1 text-gray-300 text-[11px] line-clamp-2">
                      {citationText}
                    </div>
                  )}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-900/95"></div>
                </div>
              )}
            </span>
          );
        }
        // If file not found in tree
        return (
          <span key={index} className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold mx-0.5" title={displayName}>
            {citationIndex}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Text Chat Handler
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setIsThinking(true);

    const fixedAnswer = `首先，不要只看学校名气或专业名称，而要根据你自己的实际情况来判断。

第一，看你的英语基础。
如果你四级刚过、六级没考过，或者背单词很吃力，读长文章经常看不懂逻辑，那说明你的词汇量和语感还不足以应对英一。因为第一章明确提到，英一的文章多选自学术期刊，词汇更难、句子更复杂，要求5500+词汇量[[第1章 考研英语全景解析.md:英语（一）：难度更高，词汇量要求约5500+，文章多选自学术期刊、科技文献]]；而英二内容更贴近生活、商业、教育，词汇要求约4500，整体更友好[[第1章 考研英语全景解析.md:英语（二）：难度相对较低，词汇量约4500+，文章更贴近生活、商业、教育]]。这种情况下，选英二是更明智的选择。

第二，看你的时间和目标分数。
如果你每天能投入英语的时间少于1.5小时，或者总分目标在65–70分之间，那英二更适合你。因为英二没有翻译题，省下20分钟可以留给作文；作文是图表类，结构固定，容易套模板拿分；新题型也基本是送分题。而英一光是翻译和图画作文就更耗精力。第一章强调"作文必须留足50分钟，不可压缩"[[第1章 考研英语全景解析.md:作文必须留足50分钟，不可压缩]]，在时间紧张的情况下，英二的整体节奏更容易掌控。

第三，别被"英二变难了"吓到，但要理解"难在哪"。
第一章说英二近年向英一靠拢，但本质上还是考"理解语篇"，不是考偏难怪[[第1章 考研英语全景解析.md:考研英语不是"背单词"的考试，而是"理解语篇"的考试]]。它的难点更多在细节匹配和数据理解，而不是深层逻辑推断。如果你擅长抓段落主旨、找关键词，但不太会"脑补作者没说的意思"，那你其实更适合英二。

第四，做一次真实测试，别凭感觉。
今天就找一篇2023年英一阅读和一篇英二阅读，同样限时15分钟做完。如果英二正确率明显更高、读起来更顺畅，那就说明你的能力现阶段更匹配英二。上岸的关键不是挑战高难度，而是最大化你的得分效率。

最后记住：考研是总分游戏。
用英二稳稳拿70分，比硬啃英一只拿55分更有价值。选择让你英语不拖后腿的考试类型，才能把精力留给专业课和政治——这才是第一章想传达的核心策略：合理分配时间和精力，优先攻克提分性价比高的部分[[第1章 考研英语全景解析.md:合理分配时间和精力，是取得高分的关键]]。`;

    // 思考阶段：等待2.5秒
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setIsThinking(false);
    setIsLoading(false);

    // 创建AI消息，初始为空
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: 'model',
      text: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMsg]);
    setCurrentTypingMessageId(aiMsgId);
    setTypingText('');

    // 打字机效果：逐字显示
    let currentIndex = 0;
    const typingSpeed = 60; // 每个字符的延迟（毫秒）

    const typeNextChar = () => {
      if (currentIndex < fixedAnswer.length) {
        setTypingText(fixedAnswer.substring(0, currentIndex + 1));
        currentIndex++;
        typingIntervalRef.current = setTimeout(typeNextChar, typingSpeed);
      } else {
        // 打字完成，更新消息
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, text: fixedAnswer } : msg
        ));
        setCurrentTypingMessageId(null);
        setTypingText('');
        if (typingIntervalRef.current) {
          clearTimeout(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    };

    typeNextChar();
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingText]);

  // Cleanup typing interval on unmount
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearTimeout(typingIntervalRef.current);
      }
    };
  }, []);


  // Live Voice Hook
  const { isConnecting, isPlaying } = useLiveSession(
    isVoiceMode, 
    () => setIsVoiceMode(false),
    getContext() // Passing dynamic context to system instruction for voice
  );

  return (
    <div className="flex flex-col h-full relative bg-transparent">
      {/* Header - Enhanced Design */}
      <div className="px-6 py-2 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-100/60 z-20 shrink-0 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
           <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isVoiceMode ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'bg-white shadow-sm border border-gray-200/60'}`}>
              <Bot size={14} className={isVoiceMode ? 'text-white' : 'text-blue-600'} />
           </div>
           <div className="flex flex-col">
              <h3 className="font-extrabold text-gray-800 text-sm tracking-tight leading-none">AI 学习助手</h3>
           </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-700 transition-all bg-gray-50/80 hover:bg-gray-100/90 p-2 rounded-full hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
        >
          <X size={16} />
        </button>
      </div>

      {/* Voice Mode Overlay (Glassmorphism) */}
      {isVoiceMode && (
        <div className="absolute inset-0 bg-white/30 backdrop-blur-2xl z-30 flex flex-col items-center justify-center text-center p-6 space-y-10 animate-fadeIn">
          <div className="relative">
            {/* Pulsing Rings */}
            {isPlaying && (
              <>
                <div className="absolute inset-0 rounded-full bg-sky-400/20 animate-ping blur-xl"></div>
                <div className="absolute -inset-8 rounded-full bg-sky-300/10 animate-pulse blur-2xl"></div>
              </>
            )}
            
            <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-700 relative z-10 
                ${isPlaying 
                    ? 'bg-sky-400 shadow-[0_0_40px_rgba(14,165,233,0.5)] scale-110' 
                    : 'bg-white shadow-[0_10px_30px_rgba(0,0,0,0.05)] border border-white/50'
                }`}
            >
               {isConnecting ? (
                 <Loader2 size={32} className="text-gray-400 animate-spin" />
               ) : (
                 <Volume2 size={36} className={`transition-colors duration-300 ${isPlaying ? 'text-white' : 'text-gray-400'}`} />
               )}
            </div>
          </div>
          
          <div className="space-y-2 relative z-10">
            <h4 className="text-2xl font-black text-gray-800 tracking-tight">
              {isConnecting ? "连接中..." : isPlaying ? "正在说话..." : "聆听中..."}
            </h4>
            <p className="text-sm text-gray-500 font-medium">
              实时对话中
            </p>
          </div>

          <button 
             onClick={() => setIsVoiceMode(false)}
             className="px-8 py-3 bg-white/80 backdrop-blur-xl border border-white/60 rounded-full text-gray-700 hover:bg-white shadow-xl shadow-gray-200/40 text-sm font-bold active:scale-95 transition-all relative z-10"
          >
            切换到文字
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent via-transparent to-gray-50/20">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`animate-in slide-in-from-bottom-2 duration-300 ${
              msg.role === 'user' 
                ? 'flex justify-end px-5 py-4' 
                : 'w-full'
            }`}
          >
            {msg.role === 'user' ? (
              // 用户消息：保持聊天气泡形式
              <div className="max-w-[88%] px-5 py-3.5 text-sm leading-relaxed bg-gradient-to-br from-sky-400 to-sky-500 text-white rounded-[1.25rem] rounded-br-[2px] shadow-lg shadow-sky-400/25 font-medium">
                {msg.text}
              </div>
            ) : (
              // AI 消息：类似 Gemini/ChatGPT 的显示形式
              <div className="w-full border-b border-gray-100/40 hover:bg-gray-50/50 transition-colors group">
                <div className="px-6 py-6 max-w-none">
                  <div className="flex gap-4">
                    {/* AI 图标 */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200/60 flex items-center justify-center group-hover:shadow-md transition-shadow">
                        <Bot size={16} className="text-blue-600" />
                      </div>
                    </div>
                    {/* 消息内容 */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      {currentTypingMessageId === msg.id && typingText ? (
                        <div className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap">
                          {renderMessageText(typingText, msg.id)}
                          <span className="inline-block w-2 h-5 bg-blue-600 ml-1 animate-pulse"></span>
                        </div>
                      ) : (
                        <div className="text-[15px] leading-7 text-gray-800 whitespace-pre-wrap">
                          {renderMessageText(msg.text, msg.id)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
        {isThinking && (
          <div className="w-full border-b border-gray-100/60">
            <div className="px-6 py-5">
              <div className="flex gap-4">
                {/* AI 图标 */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200/60 flex items-center justify-center">
                    <Bot size={16} className="text-blue-600" />
                  </div>
                </div>
                {/* 思考动画 */}
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">AI 正在思考</span>
                  <div className="flex gap-1 ml-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isLoading && !isThinking && (
          <div className="w-full border-b border-gray-100/60">
            <div className="px-6 py-5">
              <div className="flex gap-4">
                {/* AI 图标 */}
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200/60 flex items-center justify-center">
                    <Bot size={16} className="text-blue-600" />
                  </div>
                </div>
                {/* 加载动画 */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Enhanced Design */}
      <div className="p-6 shrink-0 z-20">
        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 mb-3">
          <button 
            onClick={onSummary}
            className="group relative w-8 h-8 flex items-center justify-center text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
          >
            <FileText size={16} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
              总结
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
            </div>
          </button>
          <button 
            onClick={onMindMap}
            className="group relative w-8 h-8 flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Network size={16} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
              思维导图
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
            </div>
          </button>
          {onPodcast && (
            <button 
              onClick={onPodcast}
              className="group relative w-8 h-8 flex items-center justify-center text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
            >
              <Radio size={16} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                播客
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
              </div>
            </button>
          )}
          {onPPT && (
            <button 
              onClick={onPPT}
              className="group relative w-8 h-8 flex items-center justify-center text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors"
            >
              <Presentation size={16} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                AI PPT
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
              </div>
            </button>
          )}
          {onQuiz && (
            <button 
              onClick={onQuiz}
              className="group relative w-8 h-8 flex items-center justify-center text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
            >
              <ClipboardCheck size={16} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                AI 测验
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
              </div>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2 bg-gray-50/80 rounded-[20px] pl-5 pr-2 pt-3 pb-3 border border-gray-200/60 shadow-sm focus-within:bg-white focus-within:border-sky-400 focus-within:shadow-lg focus-within:shadow-sky-400/15 transition-all duration-300 ring-1 ring-transparent focus-within:ring-sky-200/50">
          {/* Selected Files Cards */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-gray-200/40">
              {selectedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-2 bg-sky-50/90 backdrop-blur-sm border border-sky-200/60 rounded-xl text-xs font-semibold text-sky-700 group hover:bg-sky-100/90 hover:border-sky-300/80 hover:shadow-sm transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <div className="w-4 h-4 rounded-md bg-sky-400/20 flex items-center justify-center shrink-0">
                    <File size={10} className="text-sky-600" />
                  </div>
                  <span className="tracking-tight">{removeExtension(file.name)}</span>
                  <button
                    onClick={() => setSelectedFiles(selectedFiles.filter(f => f.id !== file.id))}
                    className="group/remove relative ml-0.5 w-5 h-5 rounded-full bg-gray-200/60 hover:bg-gray-300/80 flex items-center justify-center text-gray-600 hover:text-gray-800 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95"
                  >
                    <X size={10} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/remove:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                      移除
                      <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            type="text"
            className="flex-1 bg-transparent border-none focus:outline-none text-sm text-gray-800 placeholder-gray-500 font-medium h-9"
            placeholder="问问 AI..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={isVoiceMode}
          />
          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-between pl-0.5">
            <div className="flex items-center gap-2">
              <button 
                className="group/atfile relative flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AtSign size={16} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/atfile:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                  @文件
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
                </div>
              </button>
              <button 
                className="group/search relative flex items-center justify-center w-7 h-7 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Search size={16} />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/search:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                  网络搜索
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
                </div>
              </button>
              {inputValue.trim() && (
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="group/send relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 bg-sky-400 text-white shadow-lg shadow-sky-400/30 hover:bg-sky-500 active:scale-95"
                >
                  <Send size={16} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/send:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                    发送
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
                  </div>
                </button>
              )}
            </div>
            <button 
              onClick={() => setIsVoiceMode(true)}
              disabled={isLoading || (isVoiceMode && !!inputValue.trim())}
              className="group/voice relative w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Mic size={16} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/voice:opacity-100 pointer-events-none transition-opacity duration-0 z-50 shadow-lg">
                语音输入
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-transparent border-t-gray-900"></div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;