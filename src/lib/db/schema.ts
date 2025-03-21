export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  createdAt: Date;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  createdAt: Date;
  updatedAt: Date;
} 