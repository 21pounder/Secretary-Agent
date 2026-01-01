# Data Analyze Helper

An intelligent multi-agent assistant built on the Mastra framework, integrating RAG (Retrieval-Augmented Generation), data analysis, trending news, sports information, and more.

[中文文档](./README.zh-CN.md)

## 🌟 Features

### Multi-Agent Collaboration Architecture
- **Secretary Agent** - Main coordinator for task routing and management
- **Data Analyze Agent** - MySQL database queries and analysis specialist
- **Hot News Agent** - Chinese platform trending topics (Zhihu, Weibo, Bilibili, etc.)
- **Employee Rules Agent** - RAG-powered HR policy and handbook assistant

### Integrated MCP Services
- **Hot News MCP** - Trending news via Exa API
- **12306 MCP** - China Railway train ticket queries (currently disabled)
- **DBHub MCP** - MySQL database connections
- **BallDontLie MCP** - Multi-league sports data (NBA/NFL/MLB/NHL/CBA)
- **TODO MCP** - Personal todo management via natural language (currently disabled)

### Core Capabilities
- 📊 Database queries and SQL analysis
- 📰 Real-time trending news from Chinese platforms
- ⚽ Multi-league sports statistics
- 🚄 Train ticket search and trip planning
- 📖 **RAG-based Q&A with Milvus vector database** (Employee Handbook & Knowledge Book)
- 🤖 Intelligent Agent-to-Agent collaboration (A2A)
- 💾 Conversation memory with LibSQL
- ✅ Personal todo management (TODO MCP - currently disabled)

## 📋 Prerequisites

- **Node.js** >= 20.9.0
- **MySQL** (optional, for data analysis features)
- **Milvus** (for RAG features, can run via Docker)
- API Keys for various services (see configuration below)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `env.example` to `.env`:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# OpenAI API Configuration
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Milvus Vector Database (for RAG)
MILVUS_HOST=localhost
MILVUS_PORT=19530
EMPLOYEE_RULES_COLLECTION=employee_rules
MILVUS_COLLECTION=knowledge_book

# Redis Cache (optional, for query caching)
REDIS_HOST=localhost
REDIS_PORT=6379

# EXA API (Hot News) - Get from https://exa.ai
EXA_API_KEY=your-exa-api-key

# BallDontLie API (Sports) - Get from https://balldontlie.com
BALLDONTLIE_API_KEY=your-balldontlie-api-key

# MySQL Database Connection (optional)
MYSQL_DSN=mysql://username:password@host:port/database?sslmode=disable
```

### 3. Setup Milvus (for RAG features)

#### Docker (Recommended)

```bash
# Milvus Standalone
docker run -d \
  --name milvus-standalone \
  -p 19530:19530 \
  -p 9091:9091 \
  -p 2379:2379 \
  -e ETCD_USE_EMBED=true \
  -e COMMON_STORAGETYPE=local \
  milvusdb/milvus:v2.4.4 \
  milvus run standalone

# Redis (for caching)
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest
```

### 4. Index Documents (First Time Setup)

#### Index Employee Handbook

Place your employee handbook in `data/employee-rules.txt` (or `.pdf`), then run:

```bash
npm run index-pdf
```

#### Index Knowledge Book

Place your knowledge book in `data/dmbj.txt`, then run:

```bash
npm run index-dmbj
```

Expected output:
```
📘 员工手册索引工具 (Milvus)
📍 Milvus 地址: localhost:19530
📂 Collection: employee_rules
✂️  分割成 28 个块
🧮 生成嵌入向量...
✅ 索引完成!
```

### 5. Run the Project

#### Backend (Mastra Server)

**Development Mode**
```bash
npm run dev
```

Server starts at `http://localhost:4111`

**Production Build**
```bash
npm run build
npm start
```

#### Frontend (Web UI) 🎨

We provide a modern React-based web interface for interacting with the agents:

```bash
# Navigate to web directory
cd web

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Frontend runs at **`http://localhost:3000`**

**Features:**
- 💬 ChatGPT-style chat interface
- 🌓 Dark mode support
- 📱 Responsive design (mobile & desktop)
- ✨ Markdown message rendering
- ⌨️ Keyboard shortcuts (Enter to send, Shift+Enter for newline)
- 🔄 Real-time backend connection status

See [`web/README.md`](./web/README.md) for detailed frontend documentation.

## 🏗️ Project Structure

```
DataAnalyzeHelper/
├── src/
│   └── mastra/
│       ├── agents/              # Agent definitions
│       │   ├── secretary-agent.ts
│       │   ├── data-analyze-agent.ts
│       │   ├── hot-news-agent.ts
│       │   └── employee-ruler-agent.ts  # RAG Agent
│       ├── mcp/                 # MCP clients
│       │   ├── hot-news-client.ts
│       │   ├── 12306-client.ts
│       │   ├── mysql-client.ts
│       │   ├── sport-news-client.ts
│       │   └── mem0-client.ts
│       ├── config/              # Configuration
│       ├── tools/               # Custom tools
│       ├── workflows/           # Workflows
│       └── index.ts             # Mastra instance
├── web/                         # 🎨 Web Frontend (NEW!)
│   ├── src/
│   │   ├── api/client.ts        # Mastra API client
│   │   ├── App.tsx              # Main chat component
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts
│   └── package.json
├── data/                        # Documents for RAG
│   └── employee-rules.txt
├── scripts/                     # Utility scripts
│   ├── index-pdf.ts             # Document indexing
│   ├── test-mem0.ts             # Test Mem0 integration
│   └── test-knowledge-book.ts   # Test knowledge book agent
├── docs/                        # Documentation
├── milvus-data/                 # Milvus storage (if local, ignored)
├── env.example                  # Environment template
├── package.json
└── README.md
```

## 🤖 Agent Overview

### Secretary Agent
Main coordinator responsible for:
- Receiving and routing user requests
- Direct handling: train tickets, sports news
- Delegation: database analysis, trending news, HR policies

### Data Analyze Agent
Professional data analyst capable of:
- Querying MySQL database schemas
- Executing SQL queries
- Analyzing data and generating insights
- Creating structured data reports

### Hot News Agent
Fetches trending topics from:
- Zhihu Hot List
- Weibo Trending
- Bilibili Trending
- Douyin, Hupu, Douban, etc.

### Employee Rules Agent (RAG)
AI-powered HR assistant features:
- **Vector Search**: Semantic similarity search using Milvus
- **Smart Caching**: Redis-based query cache with similarity matching
- **Query Optimization**: Query rewriting and reranking for better accuracy
- **Bilingual Support**: Chinese and English queries
- **Source Citations**: Always quotes handbook references

## 💡 Usage Examples

### Employee Handbook Queries (RAG)
```
User: What types of leave are available?
→ Secretary Agent → Employee Rules Agent → RAG Search → Returns 7 leave types with citations
```

### Sports News
```
User: NBA scores today
→ Secretary Agent → Sport News Tools → Returns today's NBA games
```

### Trending Topics
```
User: What's trending on Weibo?
→ Secretary Agent → Hot News Agent → Returns Weibo hot topics
```

### Database Analysis
```
User: Query sales data from tb_shop table
→ Secretary Agent → Data Analyze Agent → SQL Execution → Analysis Report
```

### Train Tickets
```
User: Beijing to Shanghai high-speed trains
→ Secretary Agent → 12306 Tools → Returns available trains
```

## 🔬 RAG System Architecture

```
User Query
    ↓
Employee Rules Agent
    ↓
Query Input
    ↓
Redis Cache Check (Similarity-based)
    ↓ [Cache Miss]
Query Rewriting (Optional)
    ↓
Vector Search (Milvus)
    ↓
Reranking (Optional)
    ↓
Top-K Relevant Chunks
    ↓
GPT-4o-mini (Answer Generation)
    ↓
Structured Answer + Citations
    ↓
Cache Result
```

### RAG Optimization Features

1. **Smart Caching**
   - Redis-based query cache
   - Similarity-based cache hits (cosine similarity > 0.95)
   - TTL: 1 hour (configurable)

2. **Query Rewriting** (Optional)
   - Generate multiple query variants
   - Improves retrieval recall
   - Configurable count (default: 2)

3. **Reranking** (Optional)
   - Auto: Simple queries → embedding, complex → LLM
   - Embedding: Fast cosine similarity reranking
   - LLM: GPT-4o-mini semantic scoring

4. **Smart Chunking**
   - Chunk size: 512 characters
   - Overlap: 50 characters
   - Preserves context continuity

5. **Embedding Model**
   - Model: `text-embedding-3-small`
   - Dimensions: 1536
   - Provider: OpenAI

## 🔧 MCP Service Configuration

All MCP configurations are in `src/mastra/config/config.ts`, using environment variables.

Supported services:
- `mcp-server-hotnews` - News service (Exa)
- `12306-mcp` - Railway tickets
- `dbhub` - MySQL database
- `balldontlie` - Sports data

## 📊 Data Persistence

### LibSQL (Conversation Memory)
- Location: `mastra.db` (ignored in git)
- Stores: Agent conversations, context, observability

### Milvus (Vector Store)
- Docker container with persistent volumes
- Stores: Document embeddings (Employee Rules + Knowledge Book)
- Collections: `employee_rules`, `knowledge_book`
- Index: IVF_FLAT with L2 distance

### Redis (Query Cache)
- Docker container
- Stores: Query embeddings and results
- TTL: 1 hour per query

## 🔒 Security Best Practices

✅ **DO**:
- Use environment variables for all secrets
- Keep `.env` file out of version control
- Use `env.example` as a template
- Regularly rotate API keys

❌ **DON'T**:
- Commit `.env` to Git
- Hardcode API keys in source code
- Share credentials in public repos
- Use production keys in development

## 📝 Development Notes

### Adding New Documents to RAG

1. Place document in `data/` directory (`.txt` or `.pdf`)
2. Update `employee-ruler-agent.ts` file path if needed
3. Run indexing: `npm run index-pdf`
4. Restart server: `npm run dev`

### Customizing RAG Parameters

In `src/mastra/agents/employee-ruler-agent.ts`:

```typescript
// Chunk size and overlap
maxSize: 512,     // Increase for more context
overlap: 50,      // Increase for better continuity

// Top-K results
topK: 5,          // Number of chunks to retrieve
```

### Agent-to-Agent Communication

Mastra's A2A enables seamless delegation:

```typescript
agents: {
  secretaryAgent,
  dataAnalyzeAgent,
  hotNewsAgent,
  employeeRulerAgent,  // Auto-registered for A2A
}
```

## 🛠️ Tech Stack

- **Framework**: [Mastra](https://mastra.ai) - AI Agent Framework
- **AI Model**: OpenAI GPT-4o-mini
- **Vector DB**: Milvus
- **Cache**: Redis
- **Embedding**: OpenAI text-embedding-3-small
- **Database**: LibSQL (local), MySQL (analysis)
- **Protocol**: MCP (Model Context Protocol)
- **Language**: TypeScript
- **Runtime**: Node.js >= 20.9.0

## 🐛 Troubleshooting

### Milvus Connection Failed
```bash
# Check if Milvus is running
docker ps | grep milvus

# Restart Milvus
docker restart milvus-standalone

# Check Milvus logs
docker logs milvus-standalone
```

### Indexing Fails
```bash
# Check file exists
ls -la data/employee-rules.txt
ls -la data/dmbj.txt

# Check OpenAI API key
echo $OPENAI_API_KEY

# Re-run indexing
npm run index-pdf      # Employee Rules
npm run index-dmbj     # Knowledge Book
```

### RAG Returns Empty Results
```bash
# Check if collections exist (using Python)
from pymilvus import connections, utility
connections.connect(host='localhost', port='19530')
print(utility.list_collections())

# Re-index documents
npm run index-pdf
npm run index-dmbj
```

### Redis Cache Issues
```bash
# Check Redis connection
docker ps | grep redis
redis-cli -h localhost -p 6379 ping

# Clear cache
redis-cli -h localhost -p 6379 FLUSHDB
```

## 📄 License

ISC

## 🤝 Contributing

Issues and Pull Requests are welcome!

Please ensure:
- No sensitive data in commits
- Update both README.md and README.zh-CN.md
- Test RAG features after changes

---

**Built with ❤️ using [Mastra](https://mastra.ai)**
