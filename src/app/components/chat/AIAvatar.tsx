import React from 'react';
import Image from 'next/image';

interface AIAvatarProps {
  showStatus?: boolean;
}

export default function AIAvatar({ showStatus = false }: AIAvatarProps) {
  return (
    <div className="flex-shrink-0 relative">
      <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
        <Image
          src="/images/ai-avatar-2.jpg"
          alt="AI Avatar"
          width={40}
          height={40}
          className="w-full h-full object-cover"
        />
      </div>
      {showStatus && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-[1.5px] border-white shadow-sm translate-x-[20%] translate-y-[20%]"></div>
      )}
    </div>
  );
} 