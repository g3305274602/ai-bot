import React from 'react';
import ChatBox from './components/ChatBox';

function App() {
  return (
    <div className="app">
      <header>
        <h1>AI 聊天助手</h1>
      </header>
      <main>
        <ChatBox />
      </main>
    </div>
  );
}

export default App; 