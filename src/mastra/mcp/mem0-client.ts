/**
 * Mem0 Client - 长期记忆管理
 * 
 * 功能：
 * - 自动提取并存储用户偏好、习惯、背景信息
 * - 支持语义搜索用户记忆
 * - 跨会话记住用户画像
 * 
 * 使用 Mem0 官方 SDK: mem0ai
 * 文档：https://docs.mem0.ai/
 */

import { MemoryClient } from 'mem0ai';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

// 初始化 Mem0 客户端
const mem0 = new MemoryClient({
  apiKey: process.env.MEM0_API_KEY || '',
});

console.log('✅ Mem0 Client initialized');

/**
 * 工具1：搜索用户记忆
 */
export const searchMemoryTool = createTool({
  id: 'search_user_memory',
  description: 'Search user\'s long-term memories and preferences. Use this BEFORE responding to understand user\'s habits, preferences, and context from past interactions.',
  inputSchema: z.object({
    query: z.string().describe('What to search in user memory. Examples: "travel preferences", "favorite teams", "work habits", "food preferences"'),
    user_id: z.string().describe('User identifier (use their unique ID or name)'),
    limit: z.number().optional().default(5).describe('Number of memories to return (default: 5)'),
  }),
  execute: async ({ context }) => {
    try {
      const { query, user_id, limit = 5 } = context;
      
      console.log(`🔍 Searching memories for user "${user_id}": "${query}"`);
      
      // 调用 Mem0 API 搜索记忆
      const memories = await mem0.search(query, { 
        user_id,
        limit 
      });
      
      if (!memories || memories.length === 0) {
        console.log(`   ℹ️  No memories found`);
        return {
          success: true,
          memories: [],
          message: 'No relevant memories found for this user.'
        };
      }
      
      console.log(`   ✅ Found ${memories.length} memories`);
      
      return {
        success: true,
        memories: memories.map((m: any) => ({
          content: m.memory || m.text || m.content,
          metadata: m.metadata || {},
          score: m.score || 0,
        })),
        message: `Found ${memories.length} relevant memories.`
      };
    } catch (error: any) {
      console.error('❌ Memory search failed:', error.message);
      return {
        success: false,
        memories: [],
        error: error.message || 'Failed to search memories'
      };
    }
  }
});

/**
 * 工具2：添加用户记忆
 */
export const addMemoryTool = createTool({
  id: 'add_user_memory',
  description: 'Store important information about user for future reference. Use this AFTER conversations to remember user preferences, habits, or important facts.',
  inputSchema: z.object({
    content: z.string().describe('Important fact or preference to remember. Be specific and concise. Examples: "User prefers morning trains (8am)", "User follows Lakers NBA games"'),
    user_id: z.string().describe('User identifier (use their unique ID or name)'),
    metadata: z.object({
      category: z.string().optional().describe('Category of memory: travel, sports, work, food, schedule, etc.'),
    }).optional(),
  }),
  execute: async ({ context }) => {
    try {
      const { content, user_id, metadata } = context;
      
      console.log(`💾 Storing memory for user "${user_id}": "${content}"`);
      
      // 调用 Mem0 API 添加记忆
      await mem0.add(content, { 
        user_id,
        metadata: metadata || {}
      });
      
      console.log(`   ✅ Memory stored successfully`);
      
      return {
        success: true,
        message: 'Memory stored successfully.'
      };
    } catch (error: any) {
      console.error('❌ Memory storage failed:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to store memory'
      };
    }
  }
});

/**
 * 工具3：获取所有用户记忆
 */
export const getAllMemoriesTool = createTool({
  id: 'get_all_user_memories',
  description: 'Get all stored memories for a user. Useful for understanding complete user profile.',
  inputSchema: z.object({
    user_id: z.string().describe('User identifier (use their unique ID or name)'),
  }),
  execute: async ({ context }) => {
    try {
      const { user_id } = context;
      
      console.log(`📚 Retrieving all memories for user "${user_id}"`);
      
      // 调用 Mem0 API 获取所有记忆
      const memories = await mem0.getAll({ user_id });
      
      if (!memories || memories.length === 0) {
        console.log(`   ℹ️  No memories found`);
        return {
          success: true,
          memories: [],
          message: 'No memories found for this user.'
        };
      }
      
      console.log(`   ✅ Retrieved ${memories.length} memories`);
      
      return {
        success: true,
        memories: memories.map((m: any) => ({
          content: m.memory || m.text || m.content,
          metadata: m.metadata || {},
          created_at: m.created_at || null,
        })),
        count: memories.length,
        message: `Retrieved ${memories.length} memories.`
      };
    } catch (error: any) {
      console.error('❌ Memory retrieval failed:', error.message);
      return {
        success: false,
        memories: [],
        error: error.message || 'Failed to retrieve memories'
      };
    }
  }
});

/**
 * 导出所有工具
 */
export const mem0Tools = {
  search_user_memory: searchMemoryTool,
  add_user_memory: addMemoryTool,
  get_all_user_memories: getAllMemoriesTool,
};

// 导出客户端实例（如需直接使用）
export { mem0 };
