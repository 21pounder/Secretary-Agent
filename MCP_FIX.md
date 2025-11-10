/**
 * 修复 MCP 初始化失败问题
 *
 * 问题：src/mastra/agents/secretary-agent.ts 直接 await MCP 客户端，导致任何 MCP 失败都会阻止启动
 *
 * 解决方案：添加错误捕获和降级处理
 */

// ============================================
// 方案 1：在 secretary-agent.ts 中添加错误处理
// ============================================

// 将以下代码替换 secretary-agent.ts 的第 14-16 行：
// 原代码：
// const sportNewsTools = await sportNewsClient.getTools();
// const railWay12306Tools = await railWay12306Client.getTools();
// const suanmingTools = await suanmingClient.getTools();

// 新代码（带错误处理）：
let sportNewsTools = {};
let railWay12306Tools = {};
let suanmingTools = {};

try {
  console.log('🔌 正在连接 Sport News MCP...');
  sportNewsTools = await sportNewsClient.getTools();
  console.log('✅ Sport News MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  Sport News MCP 连接失败，跳过:', error.message);
  console.warn('   提示：如果缺少 uv，运行: curl -LsSf https://astral.sh/uv/install.sh | sh');
}

try {
  console.log('🔌 正在连接 12306 Railway MCP...');
  railWay12306Tools = await railWay12306Client.getTools();
  console.log('✅ 12306 Railway MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  12306 Railway MCP 连接失败，跳过:', error.message);
}

try {
  console.log('🔌 正在连接 Suanming MCP...');
  suanmingTools = await suanmingClient.getTools();
  console.log('✅ Suanming MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  Suanming MCP 连接失败，跳过:', error.message);
}

// ============================================
// 方案 2：在 hot-news-agent.ts 中添加错误处理
// ============================================

// 类似地，修改 src/mastra/agents/hot-news-agent.ts
// 原代码（第 5 行）：
// const hotNewsTools = await hotNewsClient.getTools();

// 新代码（带错误处理）：
let hotNewsTools = {};

try {
  console.log('🔌 正在连接 Hot News MCP...');
  hotNewsTools = await hotNewsClient.getTools();
  console.log('✅ Hot News MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  Hot News MCP 连接失败，跳过:', error.message);
  console.warn('   提示：如果缺少 uv，运行: curl -LsSf https://astral.sh/uv/install.sh | sh');
}

// ============================================
// 方案 3：在 data-analyze-agent.ts 中添加错误处理
// ============================================

// 修改 src/mastra/agents/data-analyze-agent.ts
// 原代码（第 6 行）：
// const mysqlTools = await mysqlClient.getTools();

// 新代码（带错误处理）：
let mysqlTools = {};

try {
  console.log('🔌 正在连接 MySQL Database MCP...');
  mysqlTools = await mysqlClient.getTools();
  console.log('✅ MySQL Database MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  MySQL Database MCP 连接失败，跳过:', error.message);
  console.warn('   提示：检查环境变量 MYSQL_DSN 是否配置正确');
}

// ============================================
// 完整的 secretary-agent.ts 修复示例
// ============================================

/*
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { railWay12306Client } from '../mcp/12306-client';
import { sportNewsClient } from '../mcp/sport-news-client';
import { mem0Tools } from '../mcp/mem0-client';
import { dataAnalyzeAgent } from './data-analyze-agent';
import { hotNewsAgent } from './hot-news-agent';
import { employeeRulerAgent } from './employee-ruler-agent';
import { weatherTool } from '../tools/weather-tool';
import { knowledgeBookAgent } from './knowledge-book-agent';
import { getKnowledgeBookCacheStats } from './knowledge-book-agent';
import { suanmingClient } from '../mcp/suanming-client';

// 🔧 添加错误处理：允许 MCP 失败时继续启动
let sportNewsTools = {};
let railWay12306Tools = {};
let suanmingTools = {};

try {
  console.log('🔌 正在连接 Sport News MCP...');
  sportNewsTools = await sportNewsClient.getTools();
  console.log('✅ Sport News MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  Sport News MCP 连接失败，跳过:', error.message);
}

try {
  console.log('🔌 正在连接 12306 Railway MCP...');
  railWay12306Tools = await railWay12306Client.getTools();
  console.log('✅ 12306 Railway MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  12306 Railway MCP 连接失败，跳过:', error.message);
}

try {
  console.log('🔌 正在连接 Suanming MCP...');
  suanmingTools = await suanmingClient.getTools();
  console.log('✅ Suanming MCP 连接成功');
} catch (error: any) {
  console.warn('⚠️  Suanming MCP 连接失败，跳过:', error.message);
}

export const secretaryAgent = new Agent({
  // ... 其他配置保持不变
  tools: {
    ...sportNewsTools,
    ...railWay12306Tools,
    ...suanmingTools,
    ...mem0Tools,
    'get-weather': weatherTool,
  },
  // ...
});
*/
