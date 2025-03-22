import React from 'react';

export default function ThinkingAnimation() {
  return (
    <div className="flex items-center gap-2 mr-2 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 border border-purple-100 shadow-sm">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
      </div>
    </div>
  );
} 