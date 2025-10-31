#!/usr/bin/env node
/**
 * 索引 employee-rules.pdf 到 Chroma 向量数据库
 * 运行方式：npx tsx scripts/index-pdf.ts
 */

// 加载环境变量
import { config } from 'dotenv';
config();

import { indexEmployeeRules } from '../src/mastra/agents/employee-ruler-agent';

console.log('🚀 开始索引员工规则文档到 Chroma...');
console.log('📍 Chroma 地址: http://192.168.254.100:6333');
console.log('📂 PDF 文件: data/employee-rules.pdf');
console.log('🔑 OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : '❌ 未设置');
console.log('🌐 OpenAI Base URL:', process.env.OPENAI_BASE_URL || '❌ 未设置（将使用默认 api.openai.com）');
console.log('');

indexEmployeeRules()
  .then(() => {
    console.log('');
    console.log('✅ 索引完成！');
    console.log('');
    console.log('📋 接下来可以：');
    console.log('  1. 运行 npm run dev 启动服务');
    console.log('  2. 通过 Secretary Agent 或 Employee Rules Agent 查询');
    console.log('  3. 示例问题：');
    console.log('     - "公司的年假政策是什么？"');
    console.log('     - "What is the vacation policy?"');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ 索引失败:');
    console.error(error);
    console.error('');
    console.error('💡 常见问题：');
    console.error('  1. 确保 Chroma 服务正在运行 (http://192.168.254.100:6333)');
    console.error('  2. 确保 PDF 文件存在 (data/employee-rules.pdf)');
    console.error('  3. 确保设置了 OPENAI_API_KEY 环境变量');
    console.error('');
    process.exit(1);
  });

