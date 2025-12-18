import { Group, User } from './types';

// Global in-memory store
// NOTE: This will reset on server restart (Vercel cold start)
// For a production app, use Redis (Vercel KV) or a database.

class InMemoryStore {
    private groups: Map<string, Group>;
    private users: Map<string, User>;

    constructor() {
        this.groups = new Map();
        this.users = new Map();
    }

    createGroup(name: string, calibration?: any): Group {
        const id = Math.random().toString(36).substring(2, 6).toUpperCase();
        const group: Group = {
            id,
            name,
            members: [],
            createdAt: Date.now(),
            calibration,
            mapImage: '/venue-map.png' // Default map for new groups
        };
        this.groups.set(id, group);
        return group;
    }

    getGroup(id: string): Group | undefined {
        return this.groups.get(id);
    }

    joinGroup(groupId: string, userId: string, userName: string): User {
        const group = this.groups.get(groupId);
        if (!group) throw new Error('Group not found');

        let user = this.users.get(userId);

        // Si el usuario ya existe pero en otro grupo (raro), lo movemos o actualizamos
        if (!user) {
            user = {
                id: userId,
                name: userName,
                groupId,
                role: 'member',
                isOnline: true,
                lastUpdated: Date.now()
            };
            this.users.set(userId, user);
        } else {
            user.name = userName;
            user.groupId = groupId;
            user.isOnline = true;
            user.lastUpdated = Date.now();
        }

        if (!group.members.includes(userId)) {
            group.members.push(userId);
        }

        return user;
    }

    updateLocation(userId: string, lat: number, lng: number): User | undefined {
        const user = this.users.get(userId);
        if (!user) return undefined;

        user.lastLocation = { lat, lng };
        user.lastUpdated = Date.now();
        user.isOnline = true;

        return user;
    }

    getGroupMembers(groupId: string): User[] {
        const group = this.groups.get(groupId);
        if (!group) return [];

        // Filter active members and update online status check
        const now = Date.now();
        return group.members
            .map(id => this.users.get(id))
            .filter((u): u is User => u !== undefined)
            .map(u => {
                // Mark offline if no update in 30 seconds
                if (now - (u.lastUpdated || 0) > 30000) {
                    u.isOnline = false;
                }
                return u;
            });
    }
}

// Singleton instance
// We use globalThis to persist across hot-reloads in dev
const globalStore = globalThis as unknown as { store: InMemoryStore };
export const store = globalStore.store || new InMemoryStore();
if (process.env.NODE_ENV !== 'production') globalStore.store = store;
