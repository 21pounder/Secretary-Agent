import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { secretaryAgent } from './agents/secretary-agent';
import { dataAnalyzeAgent } from './agents/data-analyze-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { hotNewsClient } from './mcp/hot-news-client';
import { railWay12306Client } from './mcp/12306-client';
import { mysqlClient } from './mcp/mysql-client';
import { sportNewsClient } from './mcp/sport-news-client';
import { hotNewsAgent } from './agents/hot-news-agent';
import { employeeRulerAgent } from './agents/employee-ruler-agent';
import { knowledgeBookAgent } from './agents/knowledge-book-agent';
import { mem0Tools } from './mcp/mem0-client';
import { chatRoutes } from './api/chat-routes';
import { weatherTool } from './tools/weather-tool';
import { suanmingClient } from './mcp/suanming-client';
export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { secretaryAgent, dataAnalyzeAgent, hotNewsAgent, employeeRulerAgent, knowledgeBookAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  // Milvus 向量存储在各个 agent 内部管理（employee-ruler-agent, knowledge-book-agent）
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
  server: {
    apiRoutes: chatRoutes,
  },
});

// Export MCP clients for use in agents or workflows
export { hotNewsClient, railWay12306Client, mysqlClient, sportNewsClient, employeeRulerAgent, knowledgeBookAgent, mem0Tools, weatherTool, suanmingClient };