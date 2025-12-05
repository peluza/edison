
import { createClient } from 'redis';

// Singleton Redis Client
const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));

// Connect immediately (Next.js serverless env might require specialized handling for production, 
// but for this dev setup getting a global connection is fine or connecting per request)
// To keep it simple and robust for dev:
const getClient = async () => {
    if (!client.isOpen) {
        await client.connect();
    }
    return client;
};

export const saveChat = async (chatId: string, messageData: any) => {
    const redis = await getClient();
    const key = `chat:${chatId}`;
    
    // Save the full chat conversation
    // We overwrite the key with the latest array of messages each time for simplicity,
    // or we could push if we managed state differently. 
    // Given the component sends the WHOLE history, we overwrite.
    await redis.set(key, JSON.stringify(messageData));
    
    // Add to a list of all chats for the "List" API
    // Use a Set to avoid duplicates
    await redis.sAdd('chat_index', chatId);
    
    // Store metadata (timestamp) for listing
    await redis.hSet(`chat_meta:${chatId}`, {
        timestamp: new Date().toISOString(),
        preview: messageData.messages ? messageData.messages[messageData.messages.length - 1].content.substring(0, 50) : "Empty"
    });
};

export const getChat = async (chatId: string) => {
    const redis = await getClient();
    const data = await redis.get(`chat:${chatId}`);
    return data ? JSON.parse(data) : null;
};

export const listChats = async () => {
    const redis = await getClient();
    const chatIds = await redis.sMembers('chat_index');
    
    const chats = [];
    for (const id of chatIds) {
        const meta = await redis.hGetAll(`chat_meta:${id}`);
        chats.push({
            id,
            timestamp: meta.timestamp || null,
            preview: meta.preview || null
        });
    }
    
    // Sort by timestamp descending
    return chats.sort((a, b) => {
        return (new Date(b.timestamp || 0).getTime()) - (new Date(a.timestamp || 0).getTime());
    });
};

// --- Generic Caching Utils ---

export const cacheData = async (key: string, data: any, ttlSeconds: number) => {
    try {
        const redis = await getClient();
        await redis.set(key, JSON.stringify(data), {
            EX: ttlSeconds
        });
        // console.log(`[Redis] Cached data for key: ${key} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
        console.error(`[Redis] Error check caching data for ${key}:`, error);
        return null;
    }
};

// --- View Counter Utils (Restored) ---

export const getViews = async (slug: string): Promise<number> => {
    try {
        const redis = await getClient();
        const views = await redis.get(`views:${slug}`);
        return parseInt(views || '0', 10);
    } catch (error) {
        console.error(`[Redis] Error getting views for ${slug}:`, error);
        return 0;
    }
};

export const getMultipleViews = async (slugs: string[]): Promise<Record<string, number>> => {
    if (!slugs || slugs.length === 0) return {};
    
    try {
        const redis = await getClient();
        // Use mGet for efficiency
        const keys = slugs.map(slug => `views:${slug}`);
        const values = await redis.mGet(keys);
        
        const result: Record<string, number> = {};
        slugs.forEach((slug, index) => {
            const val = values[index];
            result[slug] = val ? parseInt(val, 10) : 0;
        });
        
        return result;
    } catch (error) {
        console.error(`[Redis] Error getting multiple views:`, error);
        // Fallback: return 0 for all
        return slugs.reduce((acc, slug) => {
            acc[slug] = 0;
            return acc;
        }, {} as Record<string, number>);
    }
};

export const incrementView = async (slug: string, userId?: string): Promise<number> => {
    try {
        const redis = await getClient();
        
        if (userId) {
            // Try to add the userId to a Set of viewers for this slug
            const isNewViewer = await redis.sAdd(`viewed:${slug}`, userId);
            
            // If isNewViewer is 1 (true), it means the user hasn't viewed this before.
            // Only then do we increment the public counter.
            if (isNewViewer) {
                const newCount = await redis.incr(`views:${slug}`);
                return newCount;
            } else {
                // Return current count without incrementing
                const currentCount = await redis.get(`views:${slug}`);
                return parseInt(currentCount || '0', 10);
            }
        } else {
            // Fallback for requests without userId (shouldn't happen with updated frontend)
            // We can decide to increment or not. To be fail-safe, we increment, 
            // but the frontend should always send an ID.
            const newCount = await redis.incr(`views:${slug}`);
            return newCount;
        }
    } catch (error) {
        console.error(`[Redis] Error incrementing views for ${slug}:`, error);
        return 0;
    }
};

export const getCachedData = async (key: string) => {
    try {
        const redis = await getClient();
        const data = await redis.get(key);
        if (data) {
            // console.log(`[Redis] Cache HIT for key: ${key}`);
            return JSON.parse(data);
        }
        // console.log(`[Redis] Cache MISS for key: ${key}`);
        return null;
    } catch (error) {
        console.error(`[Redis] Error getting cached data for ${key}:`, error);
        return null;
    }
};