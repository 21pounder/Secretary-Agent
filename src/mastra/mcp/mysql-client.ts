import { MCPClient } from "@mastra/mcp";
import { MCP_CONFIG } from '../config/config';

export const mysqlClient = new MCPClient({
    id : 'mysql-mcp',
    servers: {
        'mysql-mcp': MCP_CONFIG.servers['dbhub']
    }
});

console.log('✅ Mysql Database Client initialized')
