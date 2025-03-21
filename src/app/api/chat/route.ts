import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content || '';
          controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Error processing your request', { status: 500 });
  }
} 