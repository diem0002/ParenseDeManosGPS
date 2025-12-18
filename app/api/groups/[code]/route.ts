import { NextResponse } from 'next/server';
import { store } from '@/lib/store';

export async function GET(
    request: Request,
    props: { params: Promise<{ code: string }> }
) {
    const params = await props.params;
    const code = params.code;

    const group = store.getGroup(code);

    if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = store.getGroupMembers(code);

    return NextResponse.json({
        group,
        members
    });
}
