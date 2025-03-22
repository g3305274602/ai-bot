"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { chat, ChatMessage } from "@/app/services/ai";
import ThinkingAnimation from "./ThinkingAnimation";
import { marked } from "marked";
import AIAvatar from "./AIAvatar";

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 处理消息内容的函数
const processMessageContent = (content: string) => {
  // 将内容按行分割
  const lines = content.split('\n');
  
  // 处理每一行
  const processedLines = lines.map(line => {
    // 如果行以特殊字符开头（如表情符号），将整行包装在 pre 标签中
    if (/^[^\x00-\x7F]/.test(line)) {
      return `<pre style="margin: 0; padding: 0; white-space: pre-wrap; font-family: inherit;">${line}</pre>`;
    }
    // 否则使用 marked 处理
    return marked.parse(line, { async: false });
  });

  // 将处理后的行重新组合
  return processedLines.join('\n');
};

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

// 初始化空的消息数组
const initialMessages: Message[] = [];

interface Session {
  id: string;
  created_at: string;
  title: string;
}

// 添加确认对话框组件
interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
        <div className="p-4">
          <h3 className="text-base font-medium mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-8"
          >
            取消
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="h-8 bg-red-500 hover:bg-red-600 text-white"
          >
            删除
          </Button>
        </div>
      </div>
    </div>
  );
};

export function Chat() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [windowWidth, setWindowWidth] = useState(768);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer instanceof HTMLElement) {
        const scrollHeight = scrollContainer.scrollHeight;
        scrollContainer.scrollTo({
          top: scrollHeight,
          behavior
        });
      }
    }
  };

  // 修改 useEffect，只在发送新消息和接收回复时滚动
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && shouldAutoScroll) {
      // 只在以下情况滚动：
      // 1. 正在输入回复（typing）
      // 2. 正在思考（thinking）
      // 3. 新消息（1秒内）且用户在底部
      if (lastMessage.id === "typing" || 
          lastMessage.id === "thinking" || 
          (!isLoadingSession && Date.now() - new Date(lastMessage.timestamp).getTime() < 1000)) {
        scrollToBottom("smooth");
      }
    }
  }, [messages, isLoadingSession, shouldAutoScroll]);

  // 监听滚动事件
  const handleScroll = () => {
    const scrollArea = scrollAreaRef.current;
    if (scrollArea) {
      const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer instanceof HTMLElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        // 只有当用户滚动到接近底部时，才启用自动滚动
        const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
        setShouldAutoScroll(isAtBottom);
      }
    }
  };

  // 初始化窗口宽度
  useEffect(() => {
    // 只在客户端执行
    const width = window.innerWidth;
    setWindowWidth(width);
    // 在移动设备上默认隐藏侧边栏
    if (width < 768) {
      setIsSidebarOpen(false);
    }
    
    const handleResize = () => {
      const width = window.innerWidth;
      setWindowWidth(width);
      if (width < 768) {
        setIsSidebarOpen(false);
      }
    };

    // 添加窗口大小变化监听
    window.addEventListener('resize', handleResize);

    // 清理监听器
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 获取历史会话列表
  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('获取会话列表失败');
      }
      const data = await response.json();
      if (data.success && data.sessions.length > 0) {
        setSessions(data.sessions);
        // 如果没有选中的会话，自动选择最新的会话
        if (!selectedSessionId) {
          setSelectedSessionId(data.sessions[0].id);
        }
      }
    } catch (error) {
      console.error('获取会话列表错误:', error);
    }
  };

  // 加载指定会话
  const loadSession = async (sessionId: string) => {
    try {
      setIsLoadingSession(true);
      setError(null);

      const response = await fetch(`/api/session/${sessionId}`);
      if (!response.ok) {
        throw new Error('加载会话失败');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '加载会话失败');
      }

      setSessionId(data.sessionId);
      setSelectedSessionId(data.sessionId);
      
      if (data.messages && data.messages.length > 0) {
        const formattedMessages: Message[] = data.messages.map((msg: DbMessage) => ({
          id: msg.id,
          content: msg.content,
          role: msg.role,
          timestamp: new Date(msg.created_at)
        }));

        // 先设置消息但不显示
        setMessages([]);
        
        // 使用 requestAnimationFrame 确保在下一帧渲染前设置消息
        requestAnimationFrame(() => {
          const scrollArea = scrollAreaRef.current;
          if (scrollArea) {
            const scrollContainer = scrollArea.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer instanceof HTMLElement) {
              // 先将滚动容器滚动到顶部
              scrollContainer.scrollTop = 0;
              // 然后设置消息
              setMessages(formattedMessages);
              // 立即滚动到底部，不使用动画
              requestAnimationFrame(() => {
                scrollContainer.scrollTo({
                  top: scrollContainer.scrollHeight,
                  behavior: "instant"
                });
              });
            }
          }
        });
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('加载会话错误:', error);
      setError(error instanceof Error ? error.message : '加载会话失败');
    } finally {
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId && !sessionId) {
      loadSession(selectedSessionId);
    }
  }, [selectedSessionId]);

  const handleNewChat = () => {
    setSelectedSessionId(null);
    setSessionId(null);
    setMessages([]);
  };

  const saveMessageToServer = async (message: Message & { sessionId: string }) => {
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message.content,
          role: message.role,
          sessionId: message.sessionId,
          timestamp: message.timestamp.toISOString()
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '保存消息失败');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '保存消息失败');
      }

      return data.messageId;
    } catch (error) {
      console.error('保存消息错误:', error);
      throw error;
    }
  };

  // 更新会话标题
  const updateSessionTitle = async (sessionId: string, title: string) => {
    try {
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('更新会话标题失败');
      }

      // 更新本地会话列表
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, title } 
          : session
      ));
    } catch (error) {
      console.error('更新会话标题错误:', error);
    }
  };

  // 删除会话
  const deleteSession = async (sessionId: string) => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/session/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除会话失败');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '删除会话失败');
      }

      // 从本地状态中移除会话
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // 如果删除的是当前会话，清空当前会话
      if (sessionId === selectedSessionId) {
        setSelectedSessionId(null);
        setSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('删除会话错误:', error);
      setError(error instanceof Error ? error.message : '删除会话失败');
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理删除确认
  const handleDeleteConfirm = async () => {
    if (deleteTarget === 'all') {
      await Promise.all(sessions.map(session => deleteSession(session.id)))
        .then(() => {
          setSelectedSessionId(null);
          setSessionId(null);
          setMessages([]);
        });
    } else if (deleteTarget) {
      await deleteSession(deleteTarget);
    }
    setDeleteTarget(null);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let currentSessionId = sessionId;
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
    setShouldAutoScroll(true);
    scrollToBottom("smooth");

    try {
      // 如果没有会话ID，先创建新会话
      if (!currentSessionId) {
        try {
          const response = await fetch('/api/session', {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('会话创建失败');
          }

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || '会话创建失败');
          }

          currentSessionId = data.sessionId;
          if (!currentSessionId) {
            throw new Error('会话ID无效');
          }

          // 创建新会话后，将其添加到会话列表中
          const newSession: Session = {
            id: currentSessionId,
            title: input.slice(0, 50),
            created_at: new Date().toISOString()
          };
          
          // 先更新会话列表和选中状态
          setSessions(prev => [newSession, ...prev]);
          setSelectedSessionId(currentSessionId);
          setSessionId(currentSessionId);
          
          // 更新会话标题
          await updateSessionTitle(currentSessionId, input.slice(0, 50));
        } catch (error) {
          console.error('会话创建错误:', error);
          setError(error instanceof Error ? error.message : '会话创建失败');
          return;
        }
      }

      if (!currentSessionId) {
        setError('无法创建会话');
        return;
      }

      // 保存用户消息到数据库
      await saveMessageToServer({
        ...userMessage,
        sessionId: currentSessionId,
      });

      const chatMessages: ChatMessage[] = [];
      // 确保消息严格交替（用户-助手-用户-助手）
      let lastRole: string | null = null;
      
      // 先添加历史消息
      for (const msg of messages) {
        // 跳过临时消息
        if (msg.id === "thinking" || msg.id === "typing") continue;
        
        // 如果是第一条消息，或者与上一条消息角色不同，则添加
        if (!lastRole || lastRole !== msg.role) {
          chatMessages.push({
            role: msg.role,
            content: msg.content
          });
          lastRole = msg.role;
        }
      }

      // 如果最后一条消息是助手消息，或者没有消息，添加用户消息
      if (!lastRole || lastRole === "assistant") {
        chatMessages.push({ role: "user", content: input });
      }

      // 添加思考中的消息
      setMessages(prev => [...prev, {
        id: "thinking",
        content: "",
        role: "assistant",
        timestamp: new Date()
      }]);

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
              // 将新的文本添加到内容中
              content += text;
              
              // 更新消息，保持打字机效果
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && (lastMessage.id === "thinking" || lastMessage.id === "typing")) {
                  const newMessages = [...prev.slice(0, -1)];
                  return [...newMessages, {
                    id: "typing",
                    content: content,
                    role: "assistant",
                    timestamp: new Date()
                  }];
                }
                return [...prev, {
                  id: "typing",
                  content: content,
                  role: "assistant",
                  timestamp: new Date()
                }];
              });
            }
          }

          // 完成后将临时消息转换为永久消息
          const finalMessage: Message = {
            id: Date.now().toString(),
            content,
            role: "assistant",
            timestamp: new Date()
          };

          setMessages(prev => {
            const messagesWithoutTemp = prev.filter(msg => 
              msg.id !== "thinking" && msg.id !== "typing"
            );
            return [...messagesWithoutTemp, finalMessage];
          });

          // 保存助手消息到数据库
          if (content) {
            await saveMessageToServer({
              ...finalMessage,
              sessionId: currentSessionId,
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
      setMessages(prev => prev.filter(msg => msg.id !== "thinking" && msg.id !== "typing"));
    } finally {
      setIsLoading(false);
    }
  };

  // 修改遮罩层的条件
  const showOverlay = isSidebarOpen && windowWidth < 768;

  // 添加自動調整高度的功能
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-white rounded-xl shadow-lg border ">
        <div className="p-6 border-b sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-700 flex items-center gap-3">
            <div className="relative w-10 h-10">
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-purple-200 bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-6 h-6 text-purple-600"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-[1.5px] border-white shadow-sm translate-x-[20%] translate-y-[20%]"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg">心理咨询师 李歆</span>
              <span className="text-sm text-gray-500 font-normal">在线，随时为您倾听</span>
            </div>
          </h2>
        </div>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 p-8 bg-red-50 rounded-2xl shadow-sm max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="font-medium text-red-600">操作失败</p>
            <p className="text-sm text-red-500 text-center">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-2 bg-red-600 hover:bg-red-700"
            >
              重试
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget === 'all' ? "删除所有会话" : "删除会话"}
        message={deleteTarget === 'all' 
          ? "确定要删除所有历史会话吗？此操作不可恢复。"
          : "确定要删除这个会话吗？此操作不可恢复。"
        }
      />
      <div className="flex flex-col h-[calc(100vh-2rem)] max-w-5xl mx-auto bg-white rounded-xl shadow-lg border overflow-hidden">
        <div className="p-4 md:p-6 border-b sticky top-0 z-10">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <h2 className="text-xl font-bold text-gray-700 flex items-center gap-2 md:gap-3">
                <AIAvatar showStatus={true} />
                <div className="flex flex-col">
                  <span className="text-lg">心理咨询师 李歆</span>
                  <span className="text-sm text-gray-500 font-normal">在线，随时为您倾听</span>
                </div>
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-3 mt-3 md:mt-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 flex-1"
                title={isSidebarOpen ? "关闭历史会话" : "查看历史会话"}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-5 h-5"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                  <span className="text-sm">历史记录</span>
                </div>
              </button>
              <div className="flex items-center gap-2 flex-1">
                <Button
                  onClick={handleNewChat}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md w-full md:w-auto"
                  disabled={isLoading}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-5 h-5"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span>新对话</span>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* 左侧会话列表 - 桌面端 */}
          <div 
            className={`hidden md:block border-r border-purple-100/50 bg-white/50 backdrop-blur-sm transition-all duration-300 ${
              isSidebarOpen 
                ? 'w-64' 
                : 'w-16'
            }`}
          >
            <div className={`${isSidebarOpen ? 'h-full flex flex-col' : ''}`}>
              <div className={`flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-sm border-b border-purple-100/50 ${
                isSidebarOpen ? 'px-3' : 'justify-center'
              }`}>
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`rounded-xl transition-colors flex items-center text-gray-600 hover:text-gray-900 ${
                    isSidebarOpen 
                      ? 'p-2.5 flex-1 justify-between gap-2' 
                      : 'p-2.5 justify-center'
                  }`}
                  title={isSidebarOpen ? "收起历史会话" : "展开历史会话"}
                >
                  {isSidebarOpen ? (
                    <>
                      <div className="flex items-center gap-2">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-4 h-4 flex-shrink-0"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                          />
                        </svg>
                        <span className="text-sm font-medium text-gray-600 truncate whitespace-nowrap">{sessions.length} 条对话</span>
                      </div>
                    </>
                  ) : (
                  <>
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 flex items-center justify-center text-xs font-medium text-purple-600">{sessions.length}</span>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-5 h-5"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                    
                  </>
                  )}
                </button>
                {isSidebarOpen && sessions.length > 0 && (
                  <button
                    onClick={() => {
                      setDeleteTarget('all');
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 rounded-lg text-gray-500 hover:text-red-500 transition-colors flex-shrink-0"
                    disabled={isDeleting || isLoading}
                    title="清空所有历史"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-4 h-4"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
              <div className={`${isSidebarOpen ? 'flex-1 overflow-y-auto py-4' : 'space-y-3 py-4'}`}>
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group relative w-full transition-all ${
                      isSidebarOpen ? 'flex flex-col mb-1.5 px-3' : 'flex justify-center'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelectedSessionId(session.id);
                        if (windowWidth < 768) {
                          setIsSidebarOpen(false);
                        }
                        loadSession(session.id);
                      }}
                      className={`transition-all duration-200 ${
                        isSidebarOpen 
                          ? 'w-full text-left px-3 py-2.5 rounded-xl border border-transparent' 
                          : 'p-2 rounded-xl'
                      } ${
                        selectedSessionId === session.id
                          ? isSidebarOpen
                            ? "bg-gradient-to-r from-purple-500/90 to-blue-500/90 text-white shadow-md hover:shadow-lg hover:from-purple-500 hover:to-blue-500 border-purple-400/20"
                            : "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                          : isSidebarOpen
                            ? "hover:bg-white hover:border-purple-100 hover:shadow-sm text-gray-700 hover:text-gray-900"
                            : "hover:bg-gray-50 text-gray-700"
                      }`}
                      disabled={isLoading || isDeleting}
                      title={session.title || new Date(session.created_at).toLocaleString('zh-CN')}
                    >
                      {isSidebarOpen ? (
                        <div className="flex items-center gap-3">
                          <div className={`flex-shrink-0 w-1 h-10 rounded-full transition-all duration-200 ${
                            selectedSessionId === session.id
                              ? "bg-white/50"
                              : "bg-purple-100"
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {session.title || new Date(session.created_at).toLocaleString('zh-CN')}
                            </div>
                            <div className={`text-xs truncate mt-1 ${
                              selectedSessionId === session.id
                                ? "text-white/70"
                                : "text-gray-500"
                            }`}>
                              {new Date(session.created_at).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium shadow-sm ${
                          selectedSessionId === session.id
                            ? "bg-white/20 text-white border border-white/30"
                            : "bg-gradient-to-br from-purple-50 to-blue-50 text-purple-600 border border-purple-100"
                        }`}>
                          {(session.title || '会话').charAt(0)}
                        </div>
                      )}
                    </button>
                    {isSidebarOpen && (
                      <button
                        onClick={() => {
                          setDeleteTarget(session.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all duration-200"
                        disabled={isDeleting || isLoading}
                        title="删除会话"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          className="w-4 h-4 text-red-500"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 左侧会话列表 - 移动端弹窗 */}
          {isSidebarOpen && windowWidth < 768 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
              <div className="relative bg-white w-full max-w-md h-[min(600px,85vh)] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
                <div className="px-6 py-5 flex items-center justify-between sticky top-0 bg-white border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-100 flex items-center justify-center">
                      { sessions.length > 0 ? <span className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 border border-purple-200 flex items-center justify-center text-xs font-medium text-purple-600">{sessions.length}</span> :
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-4 h-4 text-purple-600"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                      }
                      
                    </div>
                    <h3 className="text-base font-medium text-gray-800">历史会话</h3>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 -m-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-5 h-5"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-4">
                  <div className="py-3 space-y-1">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="group relative w-full transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSessionId(session.id);
                              loadSession(session.id);
                              setIsSidebarOpen(false);
                            }}
                            className={`flex-1 text-left px-4 py-3 rounded-2xl transition-all duration-200 ${
                              selectedSessionId === session.id
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md"
                                : "hover:bg-gray-50 text-gray-700"
                            }`}
                            disabled={isLoading || isDeleting}
                            title={session.title || new Date(session.created_at).toLocaleString('zh-CN')}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`flex-shrink-0 w-1.5 h-8 rounded-full transition-all duration-200 ${
                                selectedSessionId === session.id
                                  ? "bg-white/50"
                                  : "bg-purple-100"
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {session.title || new Date(session.created_at).toLocaleString('zh-CN')}
                                </div>
                                <div className={`text-xs truncate mt-0.5 ${
                                  selectedSessionId === session.id
                                    ? "text-white/70"
                                    : "text-gray-400"
                                }`}>
                                  {new Date(session.created_at).toLocaleString('zh-CN')}
                                </div>
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              setDeleteTarget(session.id);
                              setShowDeleteConfirm(true);
                            }}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              selectedSessionId === session.id
                                ? "text-white/70 hover:text-white hover:bg-white/10"
                                : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                            }`}
                            disabled={isDeleting || isLoading}
                            title="删除会话"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="w-4 h-4"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {sessions.length > 0 && (
                  <div className="p-4 bg-white border-t border-gray-100">
                    <button
                      onClick={() => {
                        setDeleteTarget('all');
                        setShowDeleteConfirm(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-xl text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                      disabled={isDeleting || isLoading}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="w-4 h-4"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      <span>清空所有历史</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 遮罩层 */}
          {showOverlay && (
            <div 
              className="fixed inset-0 bg-black/20 z-20"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* 右侧聊天区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!sessionId && messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center p-4 md:p-8 rounded-2xl shadow-sm max-w-[280px] md:max-w-md mx-4">
                  <h3 className="text-lg md:text-xl font-medium text-gray-700 mb-2 md:mb-4">开始新的对话</h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                    在下方输入框中输入您的问题，开始一段新的对话。
                    或者从左侧选择一个历史会话继续交谈。
                  </p>
                </div>
              </div>
            ) : (
              <Card className="flex-1 border-0 rounded-none overflow-hidden">
                <ScrollArea 
                  ref={scrollAreaRef}
                  className="h-full scroll-area-container" 
                  scrollHideDelay={0}
                  onScrollCapture={handleScroll}
                >
                  <div className="py-4 md:py-6 space-y-6 md:space-y-8 px-3 md:px-4">
                    {isLoadingSession ? (
                      <div className="flex justify-center items-center py-8">
                        <div className="flex items-center gap-3">
                          <div className="animate-spin w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                          <span className="text-gray-500">加载消息...</span>
                        </div>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          } items-start space-x-2`}
                        >
                          {message.role === "assistant" && windowWidth >= 768 && (
                            <AIAvatar />
                          )}
                          
                          {message.id === "thinking" ? (
                            <div className="max-w-[80%] mt-2">
                              <ThinkingAnimation />
                            </div>
                          ) : message.id === "typing" ? (
                            <div
                              className={`flex flex-col space-y-1 ${
                                windowWidth < 768 ? 'max-w-[90%]' : 'max-w-[80%]'
                              } ${
                                message.role === "user" ? "items-end" : "items-start"
                              }`}
                            >
                              <div
                                className={`rounded-2xl px-6 py-3 ${
                                  message.role === "user"
                                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md ml-2"
                                    : "bg-white/90 backdrop-blur-sm border border-purple-100 shadow-sm mr-2"
                                }`}
                              >
                                <div 
                                  className={`prose prose-sm max-w-none break-words ${
                                    message.role === "user" ? "prose-invert" : ""
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html: processMessageContent(message.content)
                                  }}
                                />
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`flex flex-col space-y-1 ${
                                windowWidth < 768 ? 'max-w-[90%]' : 'max-w-[80%]'
                              } ${
                                message.role === "user" ? "items-end" : "items-start"
                              }`}
                            >
                              <div
                                className={`rounded-2xl px-6 py-3 ${
                                  message.role === "user"
                                    ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white shadow-md ml-2"
                                    : "bg-white/90 backdrop-blur-sm border border-purple-100 shadow-sm mr-2"
                                }`}
                              >
                                <div 
                                  className={`prose prose-sm max-w-none break-words ${
                                    message.role === "user" ? "prose-invert" : ""
                                  }`}
                                  dangerouslySetInnerHTML={{
                                    __html: processMessageContent(message.content)
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </Card>
            )}

            {/* 输入框区域 */}
            <div className="p-4 md:p-6 border-t sticky bottom-0 z-10 bg-white">
              <div className="flex gap-2 md:gap-4 items-end max-w-4xl mx-auto">
                <div className="flex-1 flex items-end">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                    }}
                    placeholder="分享您的想法，我在这里倾听..."
                    className="w-full rounded-2xl py-3 px-4 border-purple-100 focus:border-purple-300 focus:ring-purple-200 shadow-sm text-sm md:text-base min-h-[50px] max-h-[240px] resize-none scrollbar-none "
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={isLoading}
                    rows={1}
                  />
                </div>
                <Button 
                  onClick={handleSend}
                  className="h-[50px] px-8 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-md transition-all flex-shrink-0"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      正在思考...
                    </div>
                  ) : (
                    "发送"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}