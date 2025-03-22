import React from 'react';
import ChatBox from '../components/ChatBox';

const ChatPage = () => {
  return (
    <div className="chat-page">
      <ChatBox />
      <style jsx>{`
        .chat-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

export default ChatPage; 