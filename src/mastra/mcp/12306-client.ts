import { MCPClient } from "@mastra/mcp";
import { MCP_CONFIG } from '../config/config';

export const railWay12306Client = new MCPClient({
    id : '12306-mcp',
    servers: {
        '12306-mcp': MCP_CONFIG.servers['12306-mcp']
    }
});

console.log('✅ 12306 RailWay Client initialized')

