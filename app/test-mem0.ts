import { searchMemory } from './src/server/memory/mem0-service.ts';
async function run() {
  const res = await searchMemory('Otto', { userId: 'otto', agentId: 'kira' });
  console.log('Results:', JSON.stringify(res, null, 2));
}
run().catch(console.error);
