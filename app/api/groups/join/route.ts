import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json({ status: 'API Online', timestamp: Date.now() });
}

export async function POST(request: Request) {
    try {
        const { name, groupCode, action, calibration } = await request.json();


        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        let groupId = groupCode?.trim().toUpperCase();
        let group;

        if (action === 'create') {
            // Support restoring a previous group ID if provided
            group = store.createGroup(name + "'s Group", calibration, groupId);
            groupId = group.id;
        } else {
            if (!groupId) {
                return NextResponse.json({ error: 'Group code required' }, { status: 400 });
            }
            group = store.getGroup(groupId);
            if (!group) {
                // If action is JOIN and group not found, returns 404
                return NextResponse.json({ error: 'Group not found' }, { status: 404 });
            }
        }

        // Generate a temporary user ID for the session
        // In a real app we'd use a session cookie or auth token
        const userId = crypto.randomUUID();
        const user = store.joinGroup(groupId, userId, name);

        return NextResponse.json({
            user,
            group
        });

    } catch (error) {
        console.error('Join error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
