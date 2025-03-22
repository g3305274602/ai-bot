import React, { useState } from 'react';
import ThinkingAnimation from './ThinkingAnimation';

const ChatBox = () => {
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    // 在發送消息前就設置思考狀態
    setIsThinking(true);
    
    // 立即添加用戶消息和思考動畫
    const userMessage = { type: 'user', content: inputValue };
    const thinkingMessage = { type: 'thinking', content: null };
    setMessages(prev => [...prev, userMessage, thinkingMessage]);
    setInputValue('');

    try {
      // 這裡是實際的API請求
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: inputValue })
      });
      
      const data = await response.json();
      // 移除思考消息，添加 AI 回覆
      setMessages(prev => prev.filter(msg => msg !== thinkingMessage).concat([
        { type: 'ai', content: data.message }
      ]));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.type}`}>
            {msg.type === 'user' ? (
              <div className="user-message">{msg.content}</div>
            ) : msg.type === 'thinking' ? (
              <ThinkingAnimation />
            ) : (
              <div className="ai-message">
                <div className="ai-avatar">AI</div>
                <div className="message-content">{msg.content}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isThinking}
          placeholder={isThinking ? "AI 正在思考中..." : "輸入訊息..."}
        />
        <button 
          type="submit" 
          disabled={isThinking || !inputValue.trim()}
          className={isThinking ? 'thinking' : ''}
        >
          {isThinking ? '思考中...' : '發送'}
        </button>
      </form>

      <style jsx>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 80vh;
          background-color: #fff;
        }

        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
        }

        .message {
          margin: 8px 0;
          max-width: 80%;
        }

        .message.thinking {
          align-self: flex-start;
          margin-left: 0;
        }

        .user-message {
          background-color: #007bff;
          color: white;
          padding: 12px;
          border-radius: 12px;
          margin-left: auto;
          max-width: fit-content;
        }

        .ai-message {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-right: auto;
        }

        .ai-avatar {
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

        .message-content {
          background-color: #f0f0f0;
          padding: 12px;
          border-radius: 12px;
        }

        .input-form {
          display: flex;
          padding: 20px;
          gap: 10px;
          border-top: 1px solid #eee;
        }

        input {
          flex: 1;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        input:disabled {
          background-color: #f5f5f5;
        }

        button {
          padding: 10px 20px;
          background-color: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
        }

        button:disabled {
          background-color: #ccc;
          cursor: not-allowed;
        }

        button.thinking {
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.6; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ChatBox; 