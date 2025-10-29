
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
export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { secretaryAgent, dataAnalyzeAgent, hotNewsAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
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
});

// Export MCP clients for use in agents or workflows
export {  hotNewsClient, railWay12306Client, mysqlClient ,sportNewsClient};