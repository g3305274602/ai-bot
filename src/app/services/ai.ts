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
      const errorData = await response.json();
      throw new Error(errorData.error || 'API request failed');
    }

    if (response.headers.get('Content-Type')?.includes('application/json')) {
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    return reader;
  } catch (error) {
    console.error('Error calling chat API:', error);
    throw error;
  }
} 