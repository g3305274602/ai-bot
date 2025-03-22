import React from 'react';

const ThinkingAnimation = () => {
  return (
    <div className="thinking-bubble">
      <div className="avatar">AI</div>
      <div className="thinking-content">
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <style jsx>{`
        .thinking-bubble {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px;
          max-width: 200px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          background-color: #007bff;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .thinking-content {
          background-color: #f0f0f0;
          padding: 12px;
          border-radius: 12px;
          position: relative;
        }

        .dots {
          display: flex;
          gap: 4px;
        }

        .dots span {
          width: 8px;
          height: 8px;
          background-color: #666;
          border-radius: 50%;
          display: inline-block;
          animation: bounce 1.4s infinite ease-in-out both;
        }

        .dots span:nth-child(1) {
          animation-delay: -0.32s;
        }

        .dots span:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes bounce {
          0%, 80%, 100% { 
            transform: scale(0);
          } 
          40% { 
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ThinkingAnimation; 