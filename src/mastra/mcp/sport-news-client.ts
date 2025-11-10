import { MCPClient } from "@mastra/mcp";
import{MCP_CONFIG} from '../config/config';

export const sportNewsClient = new MCPClient({
    id: 'sport-news-search',
    servers: {
        'sport-news-search': MCP_CONFIG.servers['juhe-mcp-server']
    }
});

console.log('✅ Sport News Client initialized')
