"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { chat, ChatMessage } from "@/app/services/ai";

// 定义消息类型
export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface DbMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  created_at: string;
}

// 修改初始消息，使用固定的时间戳
const initialMessages: Message[] = [
  {
    id: "1",
    content: "你好，我想了解一下 DeepSeek R1 的功能",
    role: "user",
    timestamp: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: "2",
    content: "你好！我是 DeepSeek R1 智能助手，擅长编程、算法分析和技术问题解答。我可以帮助你解决各种技术问题，包括代码编写、调试、架构设计等。请问有什么具体问题我可以帮你解答吗？",
    role: "assistant",
    timestamp: new Date('2024-01-01T00:00:01Z'),
  }
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    // 初始化会话
    async function initSession() {
      try {
        setIsInitializing(true);
        setError(null);

        const response = await fetch('/api/session', {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error('会话初始化失败');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || '会话初始化失败');
        }

        setSessionId(data.sessionId);
        
        if (data.messages && data.messages.length > 0) {
          const formattedMessages: Message[] = data.messages.map((msg: DbMessage) => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            timestamp: new Date(msg.created_at)
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('会话初始化错误:', error);
        setError(error instanceof Error ? error.message : '会话初始化失败');
      } finally {
        setIsInitializing(false);
      }
    }

    initSession();
  }, []);

  const saveMessageToServer = async (message: Message & { sessionId: string }) => {
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error('保存消息失败');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '保存消息失败');
      }
    } catch (error) {
      console.error('保存消息错误:', error);
      // 不中断聊天流程，只记录错误
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    // 保存用户消息到数据库
    await saveMessageToServer({
      ...userMessage,
      sessionId,
    });

    try {
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      chatMessages.push({ role: "user", content: input });

      const response = await chat(chatMessages);
      let content = '';
      
      if (response) {
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await response.read();
            if (done) break;
            
            const text = decoder.decode(value);
            try {
              const jsonData = JSON.parse(text);
              if (jsonData.error) {
                throw new Error(jsonData.error);
              }
            } catch {
              content += text;
            }
            
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              if (lastMessage.role === "assistant" && lastMessage.id === "typing") {
                return [
                  ...prev.slice(0, -1),
                  { ...lastMessage, content: content }
                ];
              } else {
                return [
                  ...prev,
                  {
                    id: "typing",
                    content: content,
                    role: "assistant",
                    timestamp: new Date()
                  }
                ];
              }
            });
          }

          // 完成后更新消息 ID
          const finalMessage: Message = {
            id: Date.now().toString(),
            content,
            role: "assistant",
            timestamp: new Date()
          };

          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === "assistant" && lastMessage.id === "typing") {
              return [...prev.slice(0, -1), finalMessage];
            }
            return prev;
          });

          // 保存助手消息到数据库
          if (content) {
            await saveMessageToServer({
              ...finalMessage,
              sessionId,
            });
          }
        } catch (streamError) {
          console.error("Error reading stream:", streamError);
          throw new Error("读取响应流时出错");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error instanceof Error ? error.message : "抱歉，我遇到了一些问题。请稍后再试。";
      setError(errorMessage);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: errorMessage,
        role: "assistant",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-gradient-to-b from-gray-50 to-white rounded-xl shadow-2xl border border-gray-100 items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>正在初始化聊天...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-gradient-to-b from-gray-50 to-white rounded-xl shadow-2xl border border-gray-100 items-center justify-center">
        <div className="text-red-600 bg-red-50 p-4 rounded-lg">
          <p className="font-medium">初始化失败</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
        <Button
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-gradient-to-b from-gray-50 to-white rounded-xl shadow-2xl border border-gray-100">
      <div className="p-6 border-b bg-white rounded-t-xl sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          DeepSeek R1 助手
        </h2>
      </div>
      
      <Card className="flex-1 border-0 rounded-none bg-transparent overflow-hidden">
        <ScrollArea className="h-full">
          <div className="py-6 space-y-8 px-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } items-start space-x-3`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <Avatar className="w-10 h-10 border-2 border-blue-500 shadow-md">
                      <div className="w-full h-full flex items-center justify-center bg-blue-500 text-white text-sm font-bold">
                        R1
                      </div>
                    </Avatar>
                  </div>
                )}
                
                <div
                  className={`flex flex-col space-y-1 max-w-[80%] ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl px-6 py-3 ${
                      message.role === "user"
                        ? "bg-blue-600 text-white shadow-md ml-4"
                        : "bg-white border border-gray-200 shadow-sm mr-4"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none break-words whitespace-pre-wrap">
                      {message.content}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 px-2">
                    {message.timestamp.toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0">
                    <Avatar className="w-10 h-10 border-2 border-blue-600 shadow-md">
                      <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white text-sm font-bold">
                        你
                      </div>
                    </Avatar>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      <div className="p-6 border-t bg-white rounded-b-xl sticky bottom-0 z-10">
        <div className="flex gap-4 items-center max-w-4xl mx-auto">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题..."
            className="flex-1 rounded-full py-6 px-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500 shadow-sm text-base"
            onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            className="rounded-full px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all flex-shrink-0"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                发送中...
              </div>
            ) : (
              "发送"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 