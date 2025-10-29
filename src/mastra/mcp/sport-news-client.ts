import { MCPClient } from "@mastra/mcp";
import{MCP_CONFIG} from '../config/config';

export const sportNewsClient = new MCPClient({
    id: 'sport-news-search',
    servers: {
        'sport-news-search': MCP_CONFIG.servers['balldontlie']
    }
});

console.log('✅ Sport News Client initialized')
