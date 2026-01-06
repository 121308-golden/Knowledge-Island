import React, { useState, useRef, useEffect } from 'react';
import { FileNode } from '../types';
import { Film, Image as ImageIcon, Music, FileText, ExternalLink, Play, Pause, Loader2, ChevronDown, Mic2, Clock, HardDrive, Copy, MessageCircleQuestion, FileOutput } from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData } from '../services/liveApiUtils';

interface ContentViewerProps {
  file: FileNode | null;
  isLeftSidebarOpen?: boolean;
  isRightSidebarOpen?: boolean;
}

// --- TTS Player Component (iOS 18 Style) ---
const TTSPlayer = ({ text }: { text: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [playbackRate, setPlaybackRate] = useState(1); // Default 1 (1.0x)
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  const voices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

  // Cleanup on unmount or text change
  useEffect(() => {
    // Reset state when text changes
    stopAudio();
    audioBufferRef.current = null;
    setDuration(0);
    
    return () => {
      stopAudio();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [text]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsPlaying(false);
    pausedAtRef.current = 0;
    setProgress(0);
    setCurrentTime(0);
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      // Pause logic
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        await audioContextRef.current.suspend();
        setIsPlaying(false);
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      // Play logic
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        setIsPlaying(true);
        animateProgress();
        return;
      }

      // If no buffer, fetch it
      if (!audioBufferRef.current) {
        await generateSpeech();
      } else {
         // If buffer exists but stopped (finished or manual stop without suspend), restart
         playBuffer(audioBufferRef.current, pausedAtRef.current);
      }
    }
  };

  const generateSpeech = async () => {
    setIsLoading(true);
    try {
      const apiKey = process.env.API_KEY || '';
      if (!apiKey) throw new Error("API Key missing");
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Limit text length for demo purposes/latency
      const textToSpeak = text.length > 1000 ? text.substring(0, 1000) + "..." : text;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: textToSpeak }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("No audio data returned");

      if (audioContextRef.current) {
        const audioBuffer = await decodeAudioData(
            decode(base64Audio),
            audioContextRef.current,
            24000, 
            1
        );
        audioBufferRef.current = audioBuffer;
        setDuration(audioBuffer.duration);
        playBuffer(audioBuffer, 0);
      }
    } catch (error) {
      console.error("TTS Error:", error);
      alert("生成语音失败，请检查 API Key。");
    } finally {
      setIsLoading(false);
    }
  };

  const playBuffer = (buffer: AudioBuffer, offset: number) => {
    if (!audioContextRef.current) return;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
       // Ideally verify if it ended naturally or was stopped
    };

    source.start(0, offset);
    sourceNodeRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime - (offset / playbackRate);
    setIsPlaying(true);
    animateProgress();
  };

  const animateProgress = () => {
    if (!audioContextRef.current || !sourceNodeRef.current || !audioBufferRef.current) return;

    const update = () => {
       if (!audioContextRef.current || audioContextRef.current.state !== 'running') return;
       
       const bufferDuration = audioBufferRef.current!.duration;
       // Calculate current time based on playback rate
       const elapsedTime = (audioContextRef.current.currentTime - startTimeRef.current) * playbackRate;

       if (elapsedTime >= bufferDuration) {
           setIsPlaying(false);
           pausedAtRef.current = 0;
           setProgress(100);
           setCurrentTime(bufferDuration);
           return;
       }

       setCurrentTime(elapsedTime);
       setProgress((elapsedTime / bufferDuration) * 100);
       pausedAtRef.current = elapsedTime;
       animationFrameRef.current = requestAnimationFrame(update);
    };
    
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(update);
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedVoice(e.target.value);
      stopAudio();
      audioBufferRef.current = null; 
      setDuration(0);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newRate = parseFloat(e.target.value);
      setPlaybackRate(newRate);
      
      // If playing, we need to adjust the startTime to keep the audio continuous at the new rate
      // or simply restart from current position with new rate (easier implementation for Web Audio API basics)
      if (sourceNodeRef.current && isPlaying && audioBufferRef.current) {
          sourceNodeRef.current.stop();
          playBuffer(audioBufferRef.current, pausedAtRef.current);
      }
  };

  // Estimate file size of text (rough approximation 1 char = 1 byte for text, audio varies)
  const sizeMB = ((text.length * 2) / 1024 / 1024).toFixed(2); // very rough estimate
  const displayDuration = duration > 0 ? duration : (text.length / 15); // est 15 chars/sec

  return (
    // iOS 18 Style Card: Slightly darkened background for visibility on white, backdrop blur, rounded
    <div className="bg-gray-100/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-[2rem] p-5 mb-10 select-none transition-all hover:bg-gray-100 hover:shadow-xl">
        <div className="flex items-center gap-5">
            {/* Play Button */}
            <button 
                onClick={handlePlayPause}
                disabled={isLoading}
                className={`
                    w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 active:scale-95
                    ${isPlaying 
                        ? 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white ring-2 ring-sky-200' 
                        : 'bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white hover:from-sky-500 hover:via-blue-500 hover:to-blue-700 hover:shadow-lg'
                    }
                `}
            >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-1" />}
            </button>

            {/* Progress Area */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
                {/* Time Pill floating like the screenshot */}
                <div className="flex items-center gap-3">
                   <div className="bg-gradient-to-br from-sky-400 via-sky-500 to-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {formatTime(currentTime)}
                   </div>
                   {/* Progress Track */}
                   <div className="flex-1 h-1.5 bg-gray-300/50 rounded-full relative overflow-hidden">
                      <div 
                          className="absolute top-0 left-0 h-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 rounded-full transition-all duration-100 ease-linear"
                          style={{ width: `${progress}%` }}
                      />
                   </div>
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-xs text-gray-400 font-medium px-1">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 hover:text-blue-600 transition-colors group relative">
                           <Mic2 size={12} />
                           <span className="text-gray-500 group-hover:text-blue-600">朗读: </span>
                           <select 
                                value={selectedVoice} 
                                onChange={handleVoiceChange}
                                className="bg-transparent font-semibold text-gray-700 focus:outline-none cursor-pointer appearance-none pr-3"
                            >
                                {voices.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                        <span className="hidden sm:flex items-center gap-1">
                            <HardDrive size={12} /> 大小: {sizeMB}MB
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                       <Clock size={12} />
                       时长: {formatTime(displayDuration)}
                    </div>
                </div>
            </div>

            {/* Speed Selector */}
            <div className="relative group shrink-0 ml-1">
                <div className="flex items-center gap-0.5 text-xs font-bold text-gray-500 bg-white/50 px-3 py-1.5 rounded-full border border-gray-200/50 hover:border-gray-300 transition-all cursor-pointer">
                    <select 
                        value={playbackRate}
                        onChange={handleSpeedChange}
                        className="appearance-none bg-transparent cursor-pointer focus:outline-none text-right w-8"
                    >
                        <option value="0.5">0.5x</option>
                        <option value="1">1.0x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                    </select>
                    <ChevronDown size={10} className="text-gray-400" />
                </div>
            </div>
        </div>
    </div>
  );
};

// --- SIMPLE MARKDOWN PARSER FOR CONTENT ---
const MarkdownRenderer = ({ content }: { content: string }) => {
    // This splits content by line and renders elements.
    // Real implementation would use a parser, but we avoid deps here.
    const lines = content.split('\n');
    
    return (
        <div className="space-y-4">
            {lines.map((line, idx) => {
                // Heading 1
                const h1Match = line.match(/^#\s+(.+)$/);
                if (h1Match) {
                    return <h1 key={idx} id={`heading-${idx}`} className="scroll-mt-24 text-4xl font-extrabold text-gray-900 mt-8 mb-4 tracking-tight">{h1Match[1]}</h1>;
                }
                
                // Heading 2
                const h2Match = line.match(/^##\s+(.+)$/);
                if (h2Match) {
                    return <h2 key={idx} id={`heading-${idx}`} className="scroll-mt-24 text-2xl font-bold text-gray-800 mt-6 mb-3">{h2Match[1]}</h2>;
                }
                
                // Heading 3
                const h3Match = line.match(/^###\s+(.+)$/);
                if (h3Match) {
                    return <h3 key={idx} id={`heading-${idx}`} className="scroll-mt-24 text-xl font-bold text-gray-700 mt-5 mb-2">{h3Match[1]}</h3>;
                }

                // Image: ![Alt](Url)
                const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
                if (imgMatch) {
                    return (
                        <div key={idx} className="my-6 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto object-cover" />
                            {imgMatch[1] && <p className="text-center text-xs text-gray-400 mt-2 font-medium">{imgMatch[1]}</p>}
                        </div>
                    );
                }

                // List Items (Simple)
                const listMatch = line.match(/^(\d+\.|-)\s+(.+)$/);
                if (listMatch) {
                    return (
                        <div key={idx} className="flex gap-2 ml-4">
                             <span className="font-bold text-blue-600">{listMatch[1]}</span>
                             <span className="text-gray-700 leading-relaxed">{listMatch[2]}</span>
                        </div>
                    )
                }
                
                // Empty line
                if (!line.trim()) return <div key={idx} className="h-2"></div>;

                // Bold text parser (simple)
                const parts = line.split(/(\*\*.*?\*\*)/g);
                return (
                    <p key={idx} className="text-gray-700 leading-relaxed text-lg">
                        {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={pIdx} className="text-gray-900 font-bold">{part.slice(2, -2)}</strong>
                            }
                            return part;
                        })}
                    </p>
                );
            })}
        </div>
    )
}

// Video Player Component with Subtitles
const VideoPlayer: React.FC<{ file: FileNode; isLeftSidebarOpen: boolean; isRightSidebarOpen: boolean; removeExtension: (name: string) => string }> = ({ file, isLeftSidebarOpen, isRightSidebarOpen, removeExtension }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Mock subtitles data - in real app, this would come from file.subtitles or similar
  const subtitles = [
    { time: 0, text: "Hello, and welcome. I'm Olivia from OpenAI's education team." },
    { time: 10, text: "Teachers are early and active adopters of Chat GPT, with three out of five teachers already using AI." },
    { time: 20, text: "Chat GPT saves teachers time on administrative tasks, helps them create personalized materials, and fosters collaboration among colleagues." },
    { time: 35, text: "That's why we built this course, to help you move from curiosity to confident, practical use in your own classroom." },
    { time: 50, text: "The course consists of seven modules, offering a focused tour of Chat GPT's key tools for teachers, along with practical tips for getting better and more relevant answers." },
    { time: 70, text: "Quick videos, tool demos, and hands-on practice chats you can try immediately." },
    { time: 85, text: "The course will feature real teachers, sharing the examples and workflows they use every day." }
  ];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    video.addEventListener('timeupdate', updateTime);
    
    return () => {
      video.removeEventListener('timeupdate', updateTime);
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentSubtitle = () => {
    for (let i = subtitles.length - 1; i >= 0; i--) {
      if (currentTime >= subtitles[i].time) {
        return i;
      }
    }
    return -1;
  };

  const currentSubtitleIndex = getCurrentSubtitle();

  // Adjust width and padding based on sidebar states - unified left/right spacing
  const sidePadding = isRightSidebarOpen ? 'px-1 md:px-2' : (isLeftSidebarOpen ? 'pl-4 md:pl-6 pr-4 md:pr-6' : 'px-10 md:px-14');
  const maxWidth = isRightSidebarOpen ? 'max-w-[calc(100%-20px)]' : 'max-w-[calc(100%-60px)]';
  const leftMargin = isLeftSidebarOpen ? 'ml-0' : 'mx-auto';
  
  return (
    <div className={`${leftMargin} ${maxWidth} ${sidePadding} py-4 md:py-6 min-h-full relative`}>
      <div className="flex flex-col h-full">
        <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-sm mb-6">
          <video 
            ref={videoRef}
            controls 
            className="w-full h-full" 
            src={file.content}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        
        {/* Subtitles Section */}
        <div 
          className="flex-1 overflow-y-auto max-h-[calc(100vh-500px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          <div className="space-y-0.5">
            {subtitles.map((subtitle, index) => {
              const isActive = index === currentSubtitleIndex;
              return (
                <div
                  key={index}
                  className={`flex gap-6 items-start transition-all duration-200 py-2 px-1 ${
                    isActive ? 'bg-gradient-to-r from-blue-50/80 to-transparent rounded-lg' : ''
                  }`}
                >
                  <span className={`text-xs font-bold shrink-0 w-14 text-right mt-0.5 tracking-tight ${
                    isActive ? 'text-blue-600' : 'text-gray-400'
                  }`}>
                    {formatTime(subtitle.time)}
                  </span>
                  <p className={`text-sm leading-relaxed flex-1 ${
                    isActive ? 'text-gray-900 font-medium' : 'text-gray-600'
                  }`}>
                    {subtitle.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="mt-4 text-gray-500 font-bold flex items-center gap-2 px-4 py-2">
          <Film size={16} className="text-blue-600" /> {removeExtension(file.name)}
        </p>
      </div>
    </div>
  );
};

const ContentViewer: React.FC<ContentViewerProps> = ({ file, isLeftSidebarOpen = true, isRightSidebarOpen = false }) => {
  // 移除文件扩展名
  const removeExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    return fileName.substring(0, lastDotIndex);
  };

  // Text Selection State
  const [selection, setSelection] = useState<{ x: number; y: number; text: string } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle Text Selection
  useEffect(() => {
    const handleMouseUp = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) return;

      // Check if selection is within the content area (only for text files usually)
      if (contentRef.current && contentRef.current.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // Use fixed positioning based on client rect to account for viewport
        setSelection({
            x: rect.left + rect.width / 2,
            y: rect.top - 12, // slightly above
            text: text
        });
      } else {
         setSelection(null);
      }
    };

    const handleMouseDown = () => setSelection(null);
    const handleScroll = () => {
        if (selection) setSelection(null); // Hide on scroll to avoid position drift or complexity
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('scroll', handleScroll, true); // Capture scroll

    return () => {
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('scroll', handleScroll, true);
    };
  }, [selection]);

  // Context Menu Actions
  const handleCopy = () => {
    if (selection) {
        navigator.clipboard.writeText(selection.text);
        setSelection(null);
        // Could add a toast here
    }
  };

  const handleExplain = () => {
    if (selection) {
        console.log("Explain:", selection.text);
        // This is where you'd integrate with the AI chat system
        // For now, visual feedback is the priority
        setSelection(null);
    }
  };

  const handleSummarize = () => {
    if (selection) {
        console.log("Summarize:", selection.text);
        setSelection(null);
    }
  };


  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white">
        <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100">
          <FileText size={40} className="text-gray-300" />
        </div>
        <p className="font-bold text-gray-500 text-lg">选择一个文件开始阅读</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (file.type) {
      case 'text':
        return (
          // Modified: Seamless white background, removed card styling
          <div className="max-w-4xl mx-auto p-10 md:p-14 min-h-full relative">
            {/* Inject TTS Player here for text files */}
            {file.content && <TTSPlayer text={file.content} />}
            
            <div ref={contentRef} className="prose prose-slate prose-lg max-w-none">
              {/* Use Custom Markdown Renderer */}
              {file.content && <MarkdownRenderer content={file.content} />}
            </div>
          </div>
        );
      case 'image':
        return (
          <div className={`${isLeftSidebarOpen ? 'ml-0 pl-4 md:pl-6' : 'mx-auto'} max-w-[calc(100%-120px)] ${isLeftSidebarOpen ? 'pr-4 md:pr-6' : 'p-10 md:p-14'} py-4 md:py-6 min-h-full relative`}>
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-full">
                  <img 
                      src={file.content} 
                      alt={file.name} 
                      className="max-h-[90vh] w-full rounded-lg object-contain shadow-sm" 
                  />
              </div>
              <p className="mt-4 text-sm text-gray-500 font-bold flex items-center gap-2 px-4 py-2">
                  <ImageIcon size={16} className="text-blue-600" /> {removeExtension(file.name)}
              </p>
            </div>
          </div>
        );
      case 'video':
        return <VideoPlayer file={file} isLeftSidebarOpen={isLeftSidebarOpen} isRightSidebarOpen={isRightSidebarOpen || false} removeExtension={removeExtension} />;
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center min-h-full relative p-8">
             <div className="bg-gray-50 p-10 rounded-[3rem] w-full max-w-md border border-gray-100 flex flex-col items-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mb-8 text-gray-400">
                    <Music size={56} />
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900 mb-2 text-center">{removeExtension(file.name)}</h2>
                <p className="text-sm text-gray-500 mb-10 font-medium">音频播放</p>
                <audio controls className="w-full accent-blue-600" src={file.content}>
                    Your browser does not support the audio element.
                </audio>
             </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="flex flex-col h-full bg-white relative">
             <div className="border-b border-gray-100 px-6 py-3 flex items-center justify-between text-sm text-gray-500 shrink-0">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-700 truncate">{removeExtension(file.name)}</span>
                </div>
                <a 
                  href={file.content} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  <ExternalLink size={14} />
                  在新标签页打开
                </a>
             </div>
             <iframe 
                src={file.content} 
                className="w-full flex-1 border-none bg-white"
                title={file.name}
             />
          </div>
        );
      default:
        return <div className="p-10 text-red-500 font-bold">不支持的文件类型</div>;
    }
  };

  return (
    // Modified: Added [&::-webkit-scrollbar]:hidden and style prop to hide scrollbar, removed bg-slate-50
    <div 
        id="content-viewer-container" // <--- Added ID
        className="flex-1 h-full overflow-y-auto bg-white scroll-smooth flex flex-col relative [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="relative z-10 min-h-full">
        {renderContent()}
      </div>

      {/* Floating Selection Menu */}
      {selection && (
        <div 
            className="fixed z-50 flex items-center gap-1 p-1.5 bg-gray-900/90 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.3)] rounded-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ left: selection.x, top: selection.y, transform: 'translate(-50%, -100%)' }}
        >
            <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
                <Copy size={13} /> 复制
            </button>
            <div className="w-px h-4 bg-white/20 mx-0.5"></div>
            <button 
                onClick={handleExplain}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-300 hover:text-blue-200 hover:bg-blue-500/20 rounded-xl transition-colors"
            >
                <MessageCircleQuestion size={13} /> 解释
            </button>
            <button 
                onClick={handleSummarize}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20 rounded-xl transition-colors"
            >
                <FileOutput size={13} /> 总结
            </button>
            {/* Arrow */}
            <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900/90 rotate-45 border-r border-b border-white/10"></div>
        </div>
      )}
    </div>
  );
};

export default ContentViewer;