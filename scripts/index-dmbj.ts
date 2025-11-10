#!/usr/bin/env node
/**
 * 索引 dmbj.txt 到 Chroma 向量数据库
 * 运行方式：npx tsx scripts/index-dmbj.ts
 */

// 加载环境变量
import { config } from 'dotenv';
config();

import { indexKnowledgeBook } from '../src/mastra/agents/knowledge-book-agent';

const milvusHost = process.env.MILVUS_HOST || 'localhost';
const milvusPort = process.env.MILVUS_PORT || '19530';
const milvusUrl = `http://${milvusHost}:${milvusPort}`;

console.log('🚀 开始索引知识库内容到 Milvus...');
console.log('📍 Milvus 地址:', milvusUrl);
console.log('📂 Collection:', process.env.MILVUS_COLLECTION || 'knowledge_book');
console.log('📄 文件路径: data/dmbj.txt');
console.log('🔑 OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : '❌ 未设置');
console.log('🌐 OpenAI Base URL:', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1 (默认)');
console.log('');

indexKnowledgeBook()
  .then(() => {
    console.log('');
    console.log('✅ 索引完成！');
    console.log('');
    console.log('📋 接下来可以：');
    console.log('  1. 运行 npm run dev 启动服务');
    console.log('  2. 通过 Secretary Agent 或 Knowledge Book Agent 查询');
    console.log('  3. 示例问题：');
    console.log('     - "吴邪第一次进古墓是怎么回事？"');
    console.log('     - "What happened in the Seven Star Lu Palace?"');
    console.log('     - "张起灵的身份是什么？"');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ 索引失败');
    console.error('');
    
    // 只打印关键错误信息，避免打印大量文本内容
    console.error('错误类型:', error.name || 'Unknown');
    console.error('错误信息:', error.message || '未知错误');
    
    if (error.statusCode) {
      console.error('HTTP 状态码:', error.statusCode);
    }
    
    // 只打印简短的响应体
    if (error.responseBody && typeof error.responseBody === 'string' && error.responseBody.length < 500) {
      console.error('响应内容:', error.responseBody);
    }
    
    console.error('');
    console.error('💡 常见问题排查：');
    console.error(`  1. Milvus 服务: 确保正在运行 (${milvusUrl})`);
    console.error('  2. 数据文件: 确保存在 data/dmbj.txt');
    console.error('  3. OpenAI API: 确保 OPENAI_API_KEY 已设置且有效');
    console.error('  4. 网络连接: 如果无法连接 OpenAI，检查网络或代理设置');
    console.error('');
    console.error('📋 环境变量配置：');
    console.error(`  MILVUS_HOST=${process.env.MILVUS_HOST || '未设置'}`);
    console.error(`  MILVUS_PORT=${process.env.MILVUS_PORT || '未设置'}`);
    console.error(`  OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? '已设置' : '未设置'}`);
    console.error(`  OPENAI_BASE_URL=${process.env.OPENAI_BASE_URL || '未设置'}`);
    console.error('');
    process.exit(1);
  });

