import { MCPClient } from "@mastra/mcp";
import { MCP_CONFIG } from '../config/config';

export const suanmingClient = new MCPClient({
    id : 'suanming-mcp',
    servers: {
        'suanming-mcp': MCP_CONFIG.servers['wenyili-iching-mcp']
    }
});

console.log('✅ Suanming Client initialized')
