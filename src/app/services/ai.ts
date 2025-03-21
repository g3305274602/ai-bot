export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function chat(messages: ChatMessage[]) {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const reader = response.body?.getReader();
    return reader;
  } catch (error) {
    console.error('Error calling chat API:', error);
    throw error;
  }
} 