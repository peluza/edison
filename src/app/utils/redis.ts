
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