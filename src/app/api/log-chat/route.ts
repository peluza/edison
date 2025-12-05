
import { NextResponse } from 'next/server';
import { saveChat } from '@/app/utils/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, timestamp, chatId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Use provided chatId or generate a new one (though in this architecture, 
    // the frontend might not persist IDs well across reloads without more changes, 
    // so we might treat every session as new or try to retrieve one).
    // For now, let's assume we want to log the current session state.
    // If the frontend sends a chatId, use it. Otherwise create one.
    const effectiveChatId = chatId || crypto.randomUUID();

    const chatData = {
        id: effectiveChatId,
        timestamp: timestamp || new Date().toISOString(),
        messages: messages
    };

    await saveChat(effectiveChatId, chatData);

    return NextResponse.json({ success: true, logId: effectiveChatId });
  } catch (error) {
    console.error('Error logging chat to Redis:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
