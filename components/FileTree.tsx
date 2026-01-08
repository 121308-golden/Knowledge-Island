import React from 'react';
import { FileNode } from '../types';
import { Folder, FolderOpen, FileText, Image, Video, Music, ChevronRight, ChevronDown } from 'lucide-react';

interface FileTreeProps {
  files: FileNode[];
  selectedFileId: string | null;
  onSelect: (file: FileNode) => void;
  onToggleFolder: (id: string) => void;
  level?: number;
  theme?: 'blue' | 'amber';
}

const FileTree: React.FC<FileTreeProps> = ({ files, selectedFileId, onSelect, onToggleFolder, level = 0, theme = 'blue' }) => {
  const isAmber = theme === 'amber';

  // 移除文件扩展名
  const removeExtension = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) return fileName;
    return fileName.substring(0, lastDotIndex);
  };

  const getIcon = (node: FileNode) => {
    if (node.type === 'folder') {
      const colorClass = isAmber 
        ? (node.isOpen ? "text-amber-500" : "text-amber-400")
        : (node.isOpen ? "text-blue-500" : "text-blue-400");
      return node.isOpen ? <FolderOpen size={16} className={colorClass} /> : <Folder size={16} className={colorClass} />;
    }
    
    // File icons
    switch (node.type) {
      case 'image': return <Image size={16} className={isAmber ? "text-amber-600" : "text-sky-500"} />;
      case 'video': return <Video size={16} className={isAmber ? "text-amber-700" : "text-blue-500"} />;
      case 'audio': return <Music size={16} className={isAmber ? "text-yellow-600" : "text-indigo-400"} />; // Keep slight variation for types
      case 'pdf': return <FileText size={16} className={isAmber ? "text-amber-800" : "text-red-400"} />;
      case 'text': default: return <FileText size={16} className={isAmber ? "text-amber-500" : "text-blue-400"} />;
    }
  };

  const selectedBgClass = isAmber ? 'bg-amber-100 text-amber-900 font-medium' : 'bg-blue-50 text-blue-700 font-medium';
  const hoverClass = isAmber ? 'hover:bg-amber-50 hover:text-amber-900' : 'hover:bg-blue-50/50 hover:text-blue-900';
  const defaultTextClass = 'text-gray-600';

  return (
    <ul className="space-y-0.5">
      {files.map((node) => (
        <li key={node.id}>
          <div 
            className={`
              flex items-center gap-2 px-3 py-2 cursor-pointer text-sm rounded-md transition-colors mx-2
              ${selectedFileId === node.id ? selectedBgClass : `${defaultTextClass} ${hoverClass}`}
            `}
            style={{ paddingLeft: `${level * 16 + 12}px` }}
            onClick={(e) => {
              e.stopPropagation();
              if (node.type === 'folder') {
                onToggleFolder(node.id);
              } else {
                onSelect(node);
              }
            }}
          >
            {node.type === 'folder' ? (
              <span className="text-gray-400">
                {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
            ) : (
              <span className="w-3.5" /> // Spacer for non-folders
            )}
            
            <span className="shrink-0">{getIcon(node)}</span>
            <span className="truncate">{node.type === 'folder' ? node.name : removeExtension(node.name)}</span>
          </div>
          
          {node.type === 'folder' && node.isOpen && node.children && (
            <FileTree 
              files={node.children} 
              selectedFileId={selectedFileId} 
              onSelect={onSelect} 
              onToggleFolder={onToggleFolder}
              level={level + 1}
              theme={theme}
            />
          )}
        </li>
      ))}
    </ul>
  );
};

export default FileTree;