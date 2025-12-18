import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, lat, lng } = body;

        if (!userId || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const user = store.updateLocation(userId, lat, lng);

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, user });
    } catch (e) {
        console.error('Location update error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
