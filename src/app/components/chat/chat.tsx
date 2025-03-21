"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { chat, ChatMessage } from "@/app/services/ai";

// 定义消息类型
interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

// 模拟的历史消息数据
const initialMessages: Message[] = [
  {
    id: "1",
    content: "你好！我是 AI 助手，有什么我可以帮你的吗？",
    role: "assistant",
    timestamp: new Date(),
  },
  {
    id: "2",
    content: "我想了解一下人工智能的应用场景",
    role: "user",
    timestamp: new Date(),
  },
  {
    id: "3",
    content: "人工智能在多个领域都有广泛应用，比如自然语言处理、计算机视觉、机器人技术等。您对哪个方面特别感兴趣？",
    role: "assistant",
    timestamp: new Date(),
  }
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatMessages: ChatMessage[] = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      chatMessages.push({ role: "user", content: input });

      const response = await chat(chatMessages);
      
      if (response) {
        let content = '';
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
            } catch (jsonError) {
              // 如果不是 JSON 或解析失败，则按普通文本处理
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
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage.role === "assistant" && lastMessage.id === "typing") {
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, id: Date.now().toString() }
              ];
            }
            return prev;
          });
        } catch (streamError) {
          console.error("Error reading stream:", streamError);
          throw new Error("读取响应流时出错");
        }
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: error instanceof Error ? error.message : "抱歉，我遇到了一些问题。请稍后再试。",
        role: "assistant",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-3xl mx-auto bg-white rounded-lg shadow-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">AI 助手</h2>
      </div>
      
      <Card className="flex-1 border-0 rounded-none">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } items-start space-x-2`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0">
                    <Avatar className="w-8 h-8 border-2 border-primary">
                      <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium">
                        AI
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
                    className={`rounded-2xl px-4 py-2 ${
                      message.role === "user"
                        ? "bg-black text-white ml-4"
                        : "bg-gray-100 text-gray-900 mr-4"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0">
                    <Avatar className="w-8 h-8 border-2 border-black">
                      <div className="w-full h-full flex items-center justify-center bg-black text-white text-sm font-medium">
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

      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            className="flex-1 rounded-full border-gray-200 focus:border-black focus:ring-black"
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend}
            className="rounded-full px-6 bg-black hover:bg-gray-800 text-white"
            disabled={isLoading}
          >
            {isLoading ? "发送中..." : "发送"}
          </Button>
        </div>
      </div>
    </div>
  );
} 