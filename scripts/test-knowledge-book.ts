#!/usr/bin/env node
/**
 * 测试《盗墓笔记》知识库查询
 * 运行方式：npx tsx scripts/test-knowledge-book.ts
 */

// 加载环境变量
import { config } from 'dotenv';
config();

import { knowledgeBookAgent } from '../src/mastra/agents/knowledge-book-agent';

console.log('🔍 开始测试《盗墓笔记》知识库查询...');
console.log('');

// 测试查询列表
const testQueries = [
  '吴邪第一次进古墓是怎么回事？',
  '张起灵的身份是什么？',
  'What happened in the Seven Star Lu Palace?',
  '七星鲁王宫里发生了什么？',
  '王胖子是什么性格的人？',
];

async function testQuery(query: string) {
  console.log('═'.repeat(80));
  console.log(`📝 查询: ${query}`);
  console.log('─'.repeat(80));

  try {
    const startTime = Date.now();

    const result = await knowledgeBookAgent.generate(query);

    const elapsedTime = Date.now() - startTime;

    console.log('');
    console.log('✅ 回答:');
    console.log(result.text || result);
    console.log('');
    console.log(`⏱️  耗时: ${elapsedTime}ms`);
    console.log('');
  } catch (error: any) {
    console.error('❌ 查询失败:', error.message);
    console.log('');
  }
}

async function runTests() {
  for (const query of testQueries) {
    await testQuery(query);
  }

  console.log('═'.repeat(80));
  console.log('✅ 所有测试完成！');
  console.log('');

  process.exit(0);
}

runTests().catch((error) => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
