# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DataAnalyzeHelper is a multi-agent AI assistant built on the Mastra framework. It coordinates specialized agents for database analysis, trending news, sports data, HR policy queries, and travel planning through a central Secretary Agent.

**Tech Stack:**
- Mastra AI Framework (multi-agent orchestration)
- TypeScript + Node.js >= 20.9.0
- ChromaDB (vector database for RAG)
- MySQL (data analysis)
- Redis (query caching)
- Mem0 (long-term user memory)
- LibSQL (conversation persistence)

## Key Commands

### Development
```bash
npm run dev           # Start development server (http://localhost:4111)
npm run build         # Build for production
npm start             # Run production build
```

### Testing & Utilities
```bash
npm run test:mem0              # Test Mem0 integration
npm run test:knowledge-book    # Test Knowledge Book Agent queries
npm run index-pdf              # Index employee handbook into ChromaDB
npm run index-dmbj             # Index novel content into Milvus
```

### First-Time Setup
```bash
# 1. Start ChromaDB
docker run -d -p 8000:8000 -v ./chroma-data:/chroma/chroma --name chromadb chromadb/chroma:latest

# 2. Start Milvus (for Knowledge Book Agent)
# See: https://milvus.io/docs/install_standalone-docker.md
wget https://github.com/milvus-io/milvus/releases/download/v2.3.0/milvus-standalone-docker-compose.yml -O docker-compose.yml
docker-compose up -d

# 3. Index documents
npm run index-pdf    # Employee handbook → ChromaDB
npm run index-dmbj   # Novel content → Milvus
```

## Architecture

### Agent Hierarchy & Routing

**Secretary Agent** (coordinator) routes requests to specialist agents:
- **Direct handling:** Train tickets (12306 MCP), sports data (BallDontLie MCP), weather queries (Open-Meteo API), Mem0 memory operations
- **Delegates to Data Analyze Agent:** SQL queries, database schema, data analysis
- **Delegates to Hot News Agent:** Chinese trending topics (Weibo, Zhihu, Bilibili, etc.)
- **Delegates to Employee Rules Agent:** HR policy, employee handbook queries (ChromaDB RAG)
- **Delegates to Knowledge Book Agent:** Novel content queries (Milvus RAG with advanced optimizations)

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
- `12306-mcp` - China Railway tickets
- `dbhub` - MySQL connection (uses MYSQL_DSN or MYSQL_DSN_READONLY)
- `balldontlie` - Sports data (uses BALLDONTLIE_API_KEY)

**Custom Tools** (not MCP-based):
- `weather-tool` - Weather queries via Open-Meteo API (free, no API key required)
  - Location: `src/mastra/tools/weather-tool.ts`
  - Supports both Chinese and English city names
  - Returns bilingual weather conditions (中文 / English)
  - Data: temperature, humidity, wind speed, weather conditions

**Important:** MCP clients are initialized in `src/mastra/mcp/` and must be awaited: `await mysqlClient.getTools()`.

### RAG System (Employee Rules Agent)

**Vector Database:** ChromaDB (port 8000)
**Embedding Model:** OpenAI text-embedding-3-small (1536 dimensions)
**Retrieval Strategy:** Hybrid search with RRF fusion

Key components:
- `src/mastra/agents/employee-ruler-agent.ts` - Main RAG agent
- `multiSourceRetrieval()` - Combines vector + keyword search
- `reciprocalRankFusion()` - Merges multiple retrieval sources
- Document chunking: 512 chars, 50 char overlap

**Caching:** Redis-backed semantic cache (see `src/mastra/cache/query-cache.ts`):
- Similarity threshold: configurable (default 0.95)
- TTL: configurable (default 3600s)
- Stores query embeddings + results

**Important:** Always search memory BEFORE retrieval to check cache. Update cache AFTER successful retrieval.

### RAG System (Knowledge Book Agent)

**Vector Database:** Milvus (port 19530)
**Embedding Model:** OpenAI text-embedding-3-small (1536 dimensions)
**Retrieval Strategy:** Advanced hybrid search with Query Rewriting + RRF Fusion + LLM Reranker

**Purpose:** RAG-powered agent for querying novel content (《盗墓笔记》) with production-grade optimizations.

**Key Components:**
- `src/mastra/agents/knowledge-book-agent.ts` - Main RAG agent with optimizations
- `multiSourceRetrieval()` - Advanced retrieval pipeline with multi-step optimization
- `rewriteQuery()` - LLM-based query expansion (generates semantic variations)
- `rerankResults()` - LLM-based result reranking (relevance scoring)
- `reciprocalRankFusion()` - Merges results from multiple query variants
- Document chunking: 512 chars, 50 char overlap

**Advanced RAG Features:**

1. **Query Rewriting** (NEW):
   - Uses GPT-4o-mini to generate 2-3 semantic query variations
   - Improves recall by capturing different ways to phrase the same question
   - Example: "吴邪第一次进古墓" → ["吴邪初次探索古墓", "吴邪首次下墓"]
   - **Performance Impact:** +10-20% recall improvement

2. **Intelligent Reranker with Dual Strategies** (NEW):
   - **Embedding Reranker** (fast, for simple queries):
     - Uses cosine similarity between query and document embeddings
     - Faster and more cost-effective
     - Best for factual lookups and simple questions
   - **LLM Reranker** (accurate, for complex queries):
     - Scores each retrieved document for relevance (0-100)
     - Reranks results based on semantic matching and reasoning
     - Uses GPT-4o-mini with low temperature (0.3) for consistency
   - **Auto Mode** (default):
     - Intelligently switches between strategies based on query complexity
     - Complex query detection: length >100, contains "为什么/why/怎么/how", multiple questions
     - Optimizes for both speed and accuracy
   - **Performance Impact:** +15-30% precision improvement

3. **Reciprocal Rank Fusion (RRF)**:
   - Combines results from multiple query variants
   - Balances diversity and relevance
   - Formula: score = Σ(1 / (k + rank)) where k=60

4. **Redis Query Cache** (see `src/mastra/cache/query-cache.ts`):
   - Semantic similarity-based caching
   - Stores query embeddings + results
   - Configurable similarity threshold and TTL

**Retrieval Pipeline Flow:**
```
User Query
    ↓
[Check Cache] ───→ Cache Hit → Return Cached Results
    ↓ Cache Miss
[Query Rewriting] → Generate 2-3 semantic variations
    ↓
[Embed All Queries] → OpenAI text-embedding-3-small
    ↓
[Parallel Vector Search] → Search Milvus with all query variants
    ↓
[RRF Fusion] → Merge results from all searches
    ↓
[LLM Reranking] → Score and reorder by relevance
    ↓
[Update Cache] → Store results for future queries
    ↓
Return Top-K Results
```

**Milvus Configuration:**
- **Index Type:** IVF_FLAT (balance of speed/accuracy)
- **Metric:** L2 distance
- **Index Params:** nlist=256 (cluster centers)
- **Search Params:** nprobe=16 (clusters to search)
- All configurable via environment variables

**RAG Optimization Switches** (`RAG_CONFIG`):
```typescript
// Enable/disable features via environment variables
ENABLE_QUERY_REWRITE=true      # Toggle query rewriting (default: true)
ENABLE_RERANKER=true            # Toggle reranker (default: true)
QUERY_REWRITE_COUNT=2           # Number of query variations (default: 2)
RERANKER_TOPK=5                 # Top results to return after reranking (default: 5)
RERANKER_TYPE=auto              # Reranker strategy: 'embedding', 'llm', 'auto' (default: auto)
```

**Environment Variables:**
```env
# Milvus Configuration
MILVUS_HOST=localhost           # Milvus server host
MILVUS_PORT=19530               # Milvus server port
MILVUS_COLLECTION=knowledge_book  # Collection name

# RAG Optimization Controls
ENABLE_QUERY_REWRITE=true       # Enable query rewriting
ENABLE_RERANKER=true            # Enable reranker
QUERY_REWRITE_COUNT=2           # Query variations to generate
RERANKER_TOPK=5                 # Results after reranking
RERANKER_TYPE=auto              # Reranker strategy: 'embedding', 'llm', 'auto'

# Redis Cache (shared with Employee Rules Agent)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=                 # Optional
CACHE_SIMILARITY_THRESHOLD=0.50 # Lower than Employee Rules (0.95)
CACHE_TTL=3600                  # Cache expiry (seconds)
```

**Performance Tuning:**

- **High Precision Queries** (exact answers):
  - Enable both Query Rewrite + Reranker
  - Use LLM reranker: `RERANKER_TYPE=llm`
  - Set `RERANKER_TOPK=3` (fewer results, higher quality)
  - Best for: Complex reasoning, "why/how" questions, multi-step analysis

- **High Recall Queries** (broad search):
  - Enable Query Rewrite only
  - Set `QUERY_REWRITE_COUNT=3` (more variations)
  - Use embedding reranker: `RERANKER_TYPE=embedding`
  - Best for: Factual lookups, entity searches, simple questions

- **Balanced Mode** (recommended):
  - Use auto mode: `RERANKER_TYPE=auto` (default)
  - System automatically chooses best strategy based on query complexity
  - Optimizes for both speed and accuracy

- **Fast/Budget Mode**:
  - Disable both features: `ENABLE_QUERY_REWRITE=false ENABLE_RERANKER=false`
  - Uses basic vector search only
  - Still benefits from RRF fusion and caching
  - Best for: High-volume, simple queries

**Cost Considerations:**
- Query Rewriting: ~200 tokens per query (GPT-4o-mini)
- LLM Reranker: ~500 tokens per query (GPT-4o-mini)
- Embedding Reranker: ~0.0001$ per query (OpenAI embeddings)
- Auto Mode overhead: ~$0.0001-0.0002 per query (varies by query complexity)
- Caching significantly reduces repeated query costs

**Testing:**
```bash
npm run test:knowledge-book  # Test queries with logging
```

**Important:** Always use `search_knowledge_book` tool before answering. Never rely on agent's training data for novel content.

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

**Optional Services:**
- `EXA_API_KEY` - For hot news trending topics
- `BALLDONTLIE_API_KEY` - For sports data
- `MEM0_API_KEY` - For long-term memory

**Databases:**
- `CHROMA_HOST`, `CHROMA_PORT`, `CHROMA_COLLECTION` - ChromaDB for Employee Rules RAG
- `MILVUS_HOST`, `MILVUS_PORT`, `MILVUS_COLLECTION` - Milvus for Knowledge Book RAG
- `MYSQL_DSN` - MySQL connection for data analysis with full CRUD operations
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis for RAG query caching

**RAG Optimization (Knowledge Book Agent):**
- `ENABLE_QUERY_REWRITE` - Enable query rewriting (default: true)
- `ENABLE_RERANKER` - Enable reranker (default: true)
- `QUERY_REWRITE_COUNT` - Query variations to generate (default: 2)
- `RERANKER_TOPK` - Results after reranking (default: 5)
- `RERANKER_TYPE` - Reranker strategy: 'embedding', 'llm', 'auto' (default: auto)
- `CACHE_SIMILARITY_THRESHOLD` - Cache similarity threshold (default: 0.50 for Knowledge Book, 0.95 for Employee Rules)
- `CACHE_TTL` - Cache expiry in seconds (default: 3600)

## Common Development Workflows

### Adding a New Agent

1. Create agent file in `src/mastra/agents/new-agent.ts`
2. Define tools (from MCP or custom via `createTool`)
3. Export agent instance
4. Register in `src/mastra/index.ts` under `agents: { ... }`
5. Update Secretary Agent's routing logic if it should delegate

### Modifying RAG Document Index

**For Employee Rules Agent (ChromaDB):**
1. Update/add document in `data/` directory (.txt or .pdf)
2. Modify file path in `employee-ruler-agent.ts` → `indexEmployeeRules()` if needed
3. Run `npm run index-pdf`
4. Restart server: `npm run dev`

**For Knowledge Book Agent (Milvus):**
1. Update/add document in `data/` directory (.txt files)
2. Modify file path in `knowledge-book-agent.ts` → `indexKnowledgeBook()` if needed
3. Ensure Milvus is running: `docker ps | grep milvus`
4. Run `npm run index-dmbj`
   - This will drop the old collection and recreate it
   - Chunking: 512 chars, 50 char overlap
   - Index: IVF_FLAT with nlist=256
5. Verify indexing: Check console output for "✅ 索引完成"
6. Test queries: `npm run test:knowledge-book`
7. Restart server: `npm run dev`

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
- `chroma-data/` - ChromaDB vector storage
- `mastra.db` - Conversation history
- `node_modules/`

## Troubleshooting

### ChromaDB Connection Issues
```bash
# Check if running
curl http://localhost:8000/api/v1/heartbeat

# Restart
docker restart chromadb
```

### RAG Returns No Results
- Verify collection exists: `curl http://localhost:8000/api/v1/collections`
- Re-index: `npm run index-pdf`
- Check `CHROMA_HOST`, `CHROMA_PORT` in .env

### Mem0 API Key Not Found
- Check `.env` has `MEM0_API_KEY=m0-...`
- Ensure `dotenv/config` imported at top of script
- Test: `npm run test:mem0`

### Agent Not Delegating Correctly
- Check Secretary Agent's routing keywords in `secretary-agent.ts`
- Verify agent is registered in `src/mastra/index.ts`
- Check agent is added to `agents: { ... }` in Secretary Agent definition

### Milvus Connection Issues
```bash
# Check if Milvus is running
docker ps | grep milvus

# Check Milvus health
curl http://localhost:9091/healthz

# Restart Milvus
docker-compose restart
```

### Knowledge Book Agent Returns No Results
- Verify Milvus is running: `docker ps | grep milvus`
- Check collection exists: Use Milvus CLI or Attu (web UI)
- Re-index: `npm run index-dmbj`
- Check environment variables: `MILVUS_HOST`, `MILVUS_PORT`, `MILVUS_COLLECTION`
- Verify OpenAI API key is valid: `echo $OPENAI_API_KEY`
- Test with logging: `npm run test:knowledge-book`

### RAG Performance Issues
**If retrieval is too slow:**
- Disable Query Rewriting: `ENABLE_QUERY_REWRITE=false`
- Disable Reranker: `ENABLE_RERANKER=false`
- Check Redis cache is working (should see "⚡ 从缓存返回结果" in logs)
- Reduce nprobe in search params (trade accuracy for speed)

**If retrieval accuracy is poor:**
- Enable all optimizations: `ENABLE_QUERY_REWRITE=true ENABLE_RERANKER=true`
- Increase query variations: `QUERY_REWRITE_COUNT=3`
- Increase retrieval candidates: Modify `topK * 2` to `topK * 3` in code
- Check chunk quality: Review indexed content

**If costs are too high:**
- Enable caching properly (check Redis connection)
- Reduce `QUERY_REWRITE_COUNT` to 1 or disable
- Disable Reranker for non-critical queries
- Lower cache similarity threshold: `CACHE_SIMILARITY_THRESHOLD=0.40`

## Additional Documentation

- `README.md` - User-facing documentation
- `env.example` - Environment variable template
