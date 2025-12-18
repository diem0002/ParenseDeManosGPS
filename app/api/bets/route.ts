import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { groupId, userId, userName, fightId, prediction } = body;

        if (!groupId || !userId || !fightId || !prediction) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const bet = store.addBet(groupId, userId, userName, fightId, prediction);

        if (!bet) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, bet });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
