# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DataAnalyzeHelper is a multi-agent AI assistant built on the Mastra framework. It coordinates specialized agents for database analysis, trending news, sports data, HR policy queries, and knowledge queries through a central Secretary Agent.

**Tech Stack:**
- Mastra AI Framework (multi-agent orchestration)
- TypeScript + Node.js >= 20.9.0
- Milvus (vector database for RAG - both Employee Rules and Knowledge Book)
- MySQL (data analysis)
- Redis (query caching)
- Mem0 (long-term user memory)
- LibSQL (conversation persistence)

## Key Commands

### Development
```bash
npm run dev           # Start Mastra dev server (http://localhost:4111)
npm run build         # Build for production
npm start             # Run production build
```

### Web Frontend
```bash
cd web && npm install  # First time only
cd web && npm run dev  # Start frontend (http://localhost:3000)
```

### Testing & Utilities
```bash
npm run test:mem0              # Test Mem0 integration
npm run test:knowledge-book    # Test Knowledge Book Agent queries
npm run index-pdf              # Index employee handbook into Milvus
npm run index-dmbj             # Index novel content into Milvus
```

### First-Time Setup
```bash
# 1. Start Milvus (required for both RAG agents)
docker run -d \
  --name milvus-standalone \
  -p 19530:19530 -p 9091:9091 -p 2379:2379 \
  -e ETCD_USE_EMBED=true -e COMMON_STORAGETYPE=local \
  milvusdb/milvus:v2.4.4 milvus run standalone

# 2. Start Redis (for query caching)
docker run -d --name redis -p 6379:6379 redis:latest

# 3. Index documents
npm run index-pdf    # Employee handbook → Milvus (employee_rules collection)
npm run index-dmbj   # Novel content → Milvus (knowledge_book collection)
```

## Architecture

### Agent Hierarchy & Routing

**Secretary Agent** (coordinator) routes requests to specialist agents:
- **Direct handling:** Sports data (BallDontLie/RapidAPI), weather queries (Open-Meteo API), Mem0 memory operations
- **Delegates to Data Analyze Agent:** SQL queries, database schema, data analysis
- **Delegates to Hot News Agent:** Chinese trending topics (Weibo, Zhihu, Bilibili, etc.)
- **Delegates to Employee Rules Agent:** HR policy, employee handbook queries (Milvus RAG)
- **Delegates to Knowledge Book Agent:** Novel content queries (Milvus RAG with advanced optimizations)

**Note:** 12306-mcp (train tickets) is currently disabled due to server connection timeout issues.

### Critical Agent Delegation Rules

The Secretary Agent uses **keyword matching** to route queries. Check `src/mastra/agents/secretary-agent.ts` instructions for routing priority:
- **Employee/HR keywords:** 员工, 守则, 手册, 规定, 制度, 假期, employee, rules, handbook, policy → Employee Rules Agent
- **Database/SQL keywords:** 数据库, SQL, 查询, database, query, tb_ → Data Analyze Agent
- **Trending news:** 热搜, 热榜, 微博, 知乎, trending, hot topics → Hot News Agent
- **Sports:** NBA, NFL, MLB, NHL, CBA, basketball, scores → Use sport tools directly (do NOT delegate to Hot News Agent)
- **Trains:** 火车, 高铁, 12306, train, ticket → Use 12306 tools directly
- **Weather:** 天气, 气温, 温度, 下雨, weather, temperature, rain, forecast → Use get-weather tool directly

### MCP (Model Context Protocol) Integration

All MCP servers are configured in `src/mastra/config/config.ts`:
- `mcp-server-hotnews` - Exa API for news (uses EXA_API_KEY)
- `dbhub` - MySQL connection (uses MYSQL_DSN)
- `balldontlie` - Sports data (uses BALLDONTLIE_API_KEY or RAPIDAPI_KEY)
- `12306-mcp` - China Railway tickets (currently disabled)

**Custom Tools** (not MCP-based):
- `weather-tool` - Weather queries via Open-Meteo API (free, no API key required)
  - Location: `src/mastra/tools/weather-tool.ts`
  - Supports both Chinese and English city names
  - Returns bilingual weather conditions

**Important:** MCP clients are initialized in `src/mastra/mcp/` and must be awaited: `await mysqlClient.getTools()`.

### RAG System (Both Agents Use Milvus)

**Vector Database:** Milvus (port 19530)
**Embedding Model:** OpenAI text-embedding-3-small (1536 dimensions)
**Collections:** `employee_rules` (Employee Rules Agent), `knowledge_book` (Knowledge Book Agent)

Key components:
- `src/mastra/agents/employee-ruler-agent.ts` - Employee Rules RAG agent
- `src/mastra/agents/knowledge-book-agent.ts` - Knowledge Book RAG agent (with query rewriting + reranker)
- `src/mastra/cache/query-cache.ts` - Redis-backed semantic cache
- `multiSourceRetrieval()` - Combines vector + keyword search
- `reciprocalRankFusion()` - Merges multiple retrieval sources
- Document chunking: 512 chars, 50 char overlap

**Caching:** Redis-backed semantic cache:
- Similarity threshold: 0.95 (Employee Rules), 0.50 (Knowledge Book)
- TTL: 3600s (configurable)
- Stores query embeddings + results

**Important:** Always search cache BEFORE retrieval. Update cache AFTER successful retrieval.

### Knowledge Book Agent Advanced Features

The Knowledge Book Agent has additional RAG optimizations:

1. **Query Rewriting**: LLM generates 2-3 semantic variations to improve recall
2. **Intelligent Reranker** (auto/embedding/llm modes):
   - `embedding`: Fast cosine similarity (for simple queries)
   - `llm`: GPT-4o-mini scoring (for complex queries)
   - `auto`: Switches based on query complexity (default)
3. **Reciprocal Rank Fusion (RRF)**: Merges results from multiple query variants

**Pipeline:** Cache Check → Query Rewriting → Parallel Vector Search → RRF Fusion → Reranking → Cache Update.

### Mem0 Integration (Long-Term Memory)

**Purpose:** Store user preferences, habits, context across sessions

**Tools available** (in `src/mastra/mcp/mem0-client.ts`):
- `search_user_memory` - Search user's memories by query
- `add_user_memory` - Store new memory (with category metadata)
- `get_all_user_memories` - Retrieve all memories for user

**Critical Workflow** (defined in Secretary Agent instructions):
1. **BEFORE responding:** ALWAYS call `search_user_memory` to check for relevant context
2. **AFTER responding:** If user mentioned preference/habit/fact, MUST call `add_user_memory`
3. **Default user_id:** "default_user" (hardcoded in Secretary Agent)

**Memory Categories:** travel, sports, work, food, schedule, communication

**Environment:** Requires `MEM0_API_KEY` (Mem0 Cloud service). Uses `dotenv/config` for loading.

## File Structure Patterns

### Agent Definition Pattern
```typescript
// src/mastra/agents/example-agent.ts
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';

export const exampleAgent = new Agent({
  name: 'Example Agent',
  description: `...`,
  instructions: `...`,  // System prompt
  model: 'openai/gpt-4o-mini',
  tools: { ...toolsFromMCP },  // Tools from MCP clients
  agents: { ...otherAgents },  // For A2A delegation
  memory: new Memory({
    storage: new LibSQLStore({ url: 'file:../mastra.db' })
  }),
});
```

### MCP Client Pattern
```typescript
// src/mastra/mcp/example-client.ts
import { MCPClient } from '@mastra/mcp';
import { MCP_CONFIG } from '../config/config';

export const exampleClient = new MCPClient({
  id: 'example-mcp',
  servers: {
    'example-mcp': MCP_CONFIG.servers['example-key']
  }
});

console.log('✅ Example Client initialized');
```

### Mastra Registration (src/mastra/index.ts)
All agents, workflows, scorers, vectors must be registered:
```typescript
export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: { secretaryAgent, dataAnalyzeAgent, hotNewsAgent, employeeRulerAgent },
  vectors: { chroma: chromaStore },
  storage: new LibSQLStore({ url: ":memory:" }),  // Change to file:../mastra.db for persistence
  logger: new PinoLogger({ name: 'Mastra', level: 'debug' }),
  observability: { default: { enabled: true } },
});
```

## Environment Configuration

**Required:**
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_BASE_URL` - OpenAI API base URL (can use proxies)

**Vector Database (Milvus):**
- `MILVUS_HOST`, `MILVUS_PORT` - Milvus connection
- `EMPLOYEE_RULES_COLLECTION` - Collection for Employee Rules (default: employee_rules)
- `MILVUS_COLLECTION` - Collection for Knowledge Book (default: knowledge_book)

**Optional Services:**
- `EXA_API_KEY` - For hot news trending topics
- `BALLDONTLIE_API_KEY` or `RAPIDAPI_KEY` + `RAPIDAPI_HOST` - For sports data
- `MEM0_API_KEY` - For long-term memory
- `MYSQL_DSN` - MySQL connection for data analysis

**Cache & RAG Optimization:**
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis for query caching
- `CACHE_SIMILARITY_THRESHOLD` - Cache similarity threshold (0.95 for Employee Rules, 0.50 for Knowledge Book)
- `CACHE_TTL` - Cache expiry in seconds (default: 3600)
- `ENABLE_QUERY_REWRITE`, `QUERY_REWRITE_COUNT` - Query rewriting settings
- `ENABLE_RERANKER`, `RERANKER_TYPE`, `RERANKER_TOPK` - Reranker settings

## Common Development Workflows

### Adding a New Agent

1. Create agent file in `src/mastra/agents/new-agent.ts`
2. Define tools (from MCP or custom via `createTool`)
3. Export agent instance
4. Register in `src/mastra/index.ts` under `agents: { ... }`
5. Update Secretary Agent's routing logic if it should delegate

### Modifying RAG Document Index

**For Employee Rules Agent:**
1. Update/add document in `data/` directory (.txt or .pdf)
2. Modify file path in `employee-ruler-agent.ts` → `indexEmployeeRules()` if needed
3. Run `npm run index-pdf`
4. Restart server: `npm run dev`

**For Knowledge Book Agent:**
1. Update/add document in `data/` directory (.txt files)
2. Modify file path in `knowledge-book-agent.ts` → `indexKnowledgeBook()` if needed
3. Ensure Milvus is running: `docker ps | grep milvus`
4. Run `npm run index-dmbj`
5. Test queries: `npm run test:knowledge-book`
6. Restart server: `npm run dev`

### Adding MCP Service

1. Add server config in `src/mastra/config/config.ts` → `MCP_CONFIG.servers`
2. Create client in `src/mastra/mcp/new-client.ts`
3. Get tools: `await newClient.getTools()`
4. Add tools to relevant agent(s)
5. Export client from `src/mastra/index.ts`

## Important Notes

### Language Handling
All agents have **bilingual support** (Chinese/English). Response language MUST match user input language. This is enforced in agent instructions.

### Date Handling for Sports Queries
**CRITICAL:** Secretary Agent has explicit date handling rules for sports queries:
- Never use dates from 2023 or earlier (outdated)
- For "today" queries: Use TODAY's date (check system reminder for current date)
- For "latest/recent": Query MULTIPLE dates (last 3-7 days) because not every day has games
- Date format: YYYY-MM-DD
- Current season: 2024 (for 2024-2025 season)

Example: User asks "NBA today" → Query dates ["2025-10-30", "2025-10-31", "2025-11-01"] to ensure finding games.

### Storage Modes
- LibSQL storage URL in `src/mastra/index.ts`:
  - `:memory:` - In-memory (lost on restart, faster)
  - `file:../mastra.db` - Persistent (recommended for production)

### Encoding Issues (Chinese Text)
- TXT files may be GBK encoded (Windows Chinese systems)
- `employee-ruler-agent.ts` has fallback: UTF-8 → GBK detection
- Uses `iconv-lite` for GBK decoding

### Git Ignored Paths
- `.env` - Contains secrets
- `milvus-data/` - Milvus vector storage (if local)
- `mastra.db` - Conversation history
- `node_modules/`

## Troubleshooting

### Milvus Connection Issues
```bash
# Check if running
docker ps | grep milvus

# Check health
curl http://localhost:9091/healthz

# Restart
docker restart milvus-standalone
```

### RAG Returns No Results
- Verify Milvus is running
- Check collection exists (use Milvus CLI or Attu web UI)
- Re-index: `npm run index-pdf` or `npm run index-dmbj`
- Check `MILVUS_HOST`, `MILVUS_PORT` in .env
- Verify OpenAI API key is valid

### Mem0 API Key Not Found
- Check `.env` has `MEM0_API_KEY=m0-...`
- Ensure `dotenv/config` imported at top of script
- Test: `npm run test:mem0`

### Agent Not Delegating Correctly
- Check Secretary Agent's routing keywords in `secretary-agent.ts`
- Verify agent is registered in `src/mastra/index.ts`
- Check agent is added to `agents: { ... }` in Secretary Agent definition

### Redis Cache Issues
```bash
# Check Redis connection
docker ps | grep redis
redis-cli -h localhost -p 6379 ping

# Clear cache
redis-cli -h localhost -p 6379 FLUSHDB
```

### RAG Performance Issues
**Too slow:** Disable Query Rewriting (`ENABLE_QUERY_REWRITE=false`) and/or Reranker (`ENABLE_RERANKER=false`)
**Poor accuracy:** Enable all optimizations, increase `QUERY_REWRITE_COUNT`
**High costs:** Enable caching properly, reduce query variations, use embedding reranker
