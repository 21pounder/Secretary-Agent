#!/usr/bin/env tsx

/**
 * 索引员工手册文档到 Milvus
 * 运行方式：npm run index-pdf
 */

import { config as loadEnv } from 'dotenv';
loadEnv();

import { indexEmployeeRules } from '../src/mastra/agents/employee-ruler-agent';

async function main() {
  console.log('==========================================');
  console.log('📘 员工手册索引工具 (Milvus)');
  console.log('==========================================\n');

  // 显示配置信息
  const milvusHost = process.env.MILVUS_HOST || 'localhost';
  const milvusPort = process.env.MILVUS_PORT || '19530';
  const milvusUrl = `${milvusHost}:${milvusPort}`;

  console.log('📍 Milvus 地址:', milvusUrl);
  console.log('📂 Collection:', process.env.EMPLOYEE_RULES_COLLECTION || 'employee_rules');
  console.log('📄 文件路径: data/employee-rules.txt (或 .pdf)');
  console.log('🔑 OpenAI API Key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : '❌ 未设置');
  console.log('🌐 OpenAI Base URL:', process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1 (默认)');
  console.log('');
  console.log('==========================================\n');

  try {
    await indexEmployeeRules();
    console.log('\n✅ 索引成功！现在可以运行应用使用 Employee Rules Agent 了！');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ 索引失败:');
    console.error(error);
    console.error('\n💡 常见问题排查：');
    console.error(`  1. Milvus 服务: 确保正在运行 (${milvusUrl})`);
    console.error('  2. 数据文件: 确保存在 data/employee-rules.txt 或 .pdf');
    console.error('  3. OpenAI API: 确保 OPENAI_API_KEY 已设置且有效');
    console.error('  4. 网络连接: 如果无法连接 OpenAI，检查网络或代理设置');
    console.error('\n📋 环境变量配置：');
    console.error(`  MILVUS_HOST=${process.env.MILVUS_HOST || '未设置'}`);
    console.error(`  MILVUS_PORT=${process.env.MILVUS_PORT || '未设置'}`);
    console.error(`  OPENAI_API_KEY=${process.env.OPENAI_API_KEY ? '已设置' : '未设置'}`);
    console.error(`  OPENAI_BASE_URL=${process.env.OPENAI_BASE_URL || '未设置'}`);
    process.exit(1);
  }
}

main();
