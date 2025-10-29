import { MCPClient } from "@mastra/mcp";
import { MCP_CONFIG } from '../config/config';

export const hotNewsClient = new MCPClient({
    id: 'hot-news-search',
    servers:{
        'mcp-server-hotnews': MCP_CONFIG.servers['mcp-server-hotnews']
    }
});

console.log('✅ Hot News Client initialized')
