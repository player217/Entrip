/**
 * Redis Adapter Configuration for WebSocket Scaling
 * 
 * This file is prepared for future scaling needs.
 * To enable Redis adapter:
 * 1. Uncomment the Redis service in docker-compose.local.yml
 * 2. Install dependencies: pnpm add @socket.io/redis-adapter redis
 * 3. Uncomment and use this configuration in ws.ts
 */

// Uncomment when ready to scale with Redis:
/*
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

export async function setupRedisAdapter() {
  const pubClient = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379',
  });
  
  const subClient = pubClient.duplicate();
  
  await Promise.all([
    pubClient.connect(),
    subClient.connect()
  ]);

  pubClient.on('error', (err) => {
    console.error('[Redis Pub] Error:', err);
  });

  subClient.on('error', (err) => {
    console.error('[Redis Sub] Error:', err);
  });

  console.log('[Redis] Adapter connected successfully');
  
  return createAdapter(pubClient, subClient);
}
*/

// Usage in ws.ts (when ready to scale):
// import { setupRedisAdapter } from './ws-redis-adapter';
// 
// const adapter = await setupRedisAdapter();
// io.adapter(adapter);

export {}; // Make this a module