import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
    try {
        const { groupId, userId, userName, text } = await request.json();

        if (!groupId || !userId || !text) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const message = store.addMessage(groupId, userId, userName, text);

        return NextResponse.json({ success: true, message });
    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
