
import { NextResponse } from 'next/server';
import { listChats } from '@/app/utils/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chats = await listChats();
    return NextResponse.json({ chats });
  } catch (error) {
    console.error('Error fetching chat list:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
