import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const client = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com/v1',
});

// 读取系统提示
const systemPromptPath = path.join(process.cwd(), 'src', 'system-prompt.txt');
const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');

export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY) {
    return Response.json({ error: 'DeepSeek API key not configured' }, { status: 500 });
  }

  try {
    const { messages } = await req.json();

    // 添加系统提示到消息列表开头
    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const response = await client.chat.completions.create({
      model: 'deepseek-reasoner',
      messages: messagesWithSystem,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content || '';
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error('Error in stream processing:', error);
          controller.enqueue(encoder.encode(JSON.stringify({ error: '处理响应时出现错误' })));
        } finally {
          controller.close();
        }
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
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Error processing your request' 
    }, { status: 500 });
  }
} 