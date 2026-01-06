import React from 'react';
import { User, CreatorProfile } from '../types';

interface HeaderProps {
  appMode: 'reader' | 'creator';
  user?: User;
  onUserClick?: () => void;
  creatorProfile?: CreatorProfile;
  knowledgeTitle?: string;
}

const Header: React.FC<HeaderProps> = ({ user, onUserClick }) => {
  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between pl-0 pr-6 shrink-0 z-20 relative select-none">
      
      {/* Left Side: Product Branding */}
      <div className="flex items-center flex-1 min-w-0">
          {/* Logo - PNG 图片 */}
          <img 
            src="/logo.png" 
            alt="知识岛" 
            className="h-24 w-auto object-contain"
          />
      </div>

      {/* Right Side: User Profile */}
      <div className="flex-1 flex items-center justify-end gap-2 shrink-0">
         {user && onUserClick && (
            <>
                {/* Membership Info Button */}
                <button className="flex flex-col items-end gap-0.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-100">
                     <span className="text-[10px] font-bold text-white bg-black px-2 py-0.5 rounded-full uppercase tracking-wide leading-none mb-0.5 group-hover:bg-gray-800 transition-colors shadow-sm">{user.membershipTier}</span>
                     <div className="flex items-center gap-1">
                         <span className="text-xs font-black text-gray-900">{user.credits}</span>
                         <span className="text-[9px] font-bold text-gray-400">CR</span>
                    </div>
                </button>

                {/* Avatar Button */}
                <button 
                    onClick={onUserClick}
                    className="ml-1 p-0.5 rounded-full hover:ring-2 hover:ring-gray-100 transition-all active:scale-95"
                    title="个人资料"
                >
                    <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
                    />
                </button>
            </>
         )}
      </div>
    </header>
  );
};

export default Header;