import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function POST(request: Request) {
    try {
        const { userId, lat, lng } = await request.json();

        if (!userId || lat === undefined || lng === undefined) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const updatedUser = store.updateLocation(userId, lat, lng);

        if (!updatedUser) {
            // In a real app we might handle reconnection here,
            // but for now we assume client has a valid ID.
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Location update error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
