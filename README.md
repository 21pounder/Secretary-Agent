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
- **12306 MCP** - China Railway train ticket queries
- **DBHub MCP** - MySQL database connections
- **BallDontLie MCP** - Multi-league sports data (NBA/NFL/MLB/NHL/CBA)

### Core Capabilities
- 📊 Database queries and SQL analysis
- 📰 Real-time trending news from Chinese platforms
- ⚽ Multi-league sports statistics
- 🚄 Train ticket search and trip planning
- 📖 **RAG-based employee handbook Q&A with ChromaDB**
- 🤖 Intelligent Agent-to-Agent collaboration (A2A)
- 💾 Conversation memory with LibSQL

## 📋 Prerequisites

- **Node.js** >= 20.9.0
- **MySQL** (optional, for data analysis features)
- **ChromaDB** (for RAG features, can run via Docker)
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

# Chroma Vector Database (for RAG)
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=employee_rules

# EXA API (Hot News) - Get from https://exa.ai
EXA_API_KEY=your-exa-api-key

# BallDontLie API (Sports) - Get from https://balldontlie.com
BALLDONTLIE_API_KEY=your-balldontlie-api-key

# MySQL Database Connection (optional)
MYSQL_DSN=mysql://username:password@host:port/database?sslmode=disable
```

### 3. Setup ChromaDB (for RAG features)

#### Option A: Docker (Recommended)

```bash
docker run -d -p 8000:8000 \
  -v ./chroma-data:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest
```

#### Option B: Python Installation

```bash
pip install chromadb
chroma run --host localhost --port 8000 --path ./chroma-data
```

### 4. Index Employee Handbook (First Time Setup)

Place your employee handbook document in `data/employee-rules.txt` or `data/employee-rules.pdf`, then run:

```bash
npm run index-pdf
```

Expected output:
```
🚀 Starting employee rules indexing...
📄 Reading document: data/employee-rules.txt
📚 Extracted 10000+ characters
✂️  Split into 28 chunks
🧮 Generating embeddings...
✅ Generated 28 embeddings
📦 Indexing to Chroma: employee_rules
✅ Indexing complete!
```

### 5. Run the Project

#### Development Mode
```bash
npm run dev
```

Server starts at `http://localhost:4111`

#### Production Build
```bash
npm run build
npm start
```

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
│       │   └── sport-news-client.ts
│       ├── config/              # Configuration
│       ├── tools/               # Custom tools
│       ├── workflows/           # Workflows
│       └── index.ts             # Mastra instance
├── data/                        # Documents for RAG
│   └── employee-rules.txt
├── scripts/                     # Utility scripts
│   └── index-pdf.ts             # Document indexing
├── chroma-data/                 # ChromaDB storage (ignored)
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
- **Vector Search**: Semantic similarity search using ChromaDB
- **Hybrid Retrieval**: Combines vector search + keyword matching
- **Multi-Source Recall**: RRF (Reciprocal Rank Fusion) for better accuracy
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
Multi-Source Retrieval (Hybrid Search)
    ├─→ Vector Search (Semantic)
    ├─→ Keyword Search (Exact Match)
    └─→ RRF Fusion
         ↓
ChromaDB (Vector Database)
    ↓
Top-K Relevant Chunks
    ↓
GPT-4o-mini (Answer Generation)
    ↓
Structured Answer + Citations
```

### RAG Optimization Features

1. **Hybrid Retrieval**
   - Vector search for semantic understanding
   - Keyword extraction for precise matching
   - RRF fusion for optimal results

2. **Smart Chunking**
   - Chunk size: 512 characters
   - Overlap: 50 characters
   - Preserves context continuity

3. **Embedding Model**
   - Model: `text-embedding-3-small`
   - Dimensions: 1536
   - Provider: OpenAI

4. **Response Quality**
   - Direct quotes from source material
   - Language matching (Chinese ↔ English)
   - Clear "not found" handling

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

### ChromaDB (Vector Store)
- Location: `chroma-data/` (ignored in git)
- Stores: Document embeddings, metadata
- Persistence: Enabled via Docker volume or local directory

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
- **Vector DB**: ChromaDB
- **Embedding**: OpenAI text-embedding-3-small
- **Database**: LibSQL (local), MySQL (analysis)
- **Protocol**: MCP (Model Context Protocol)
- **Language**: TypeScript
- **Runtime**: Node.js >= 20.9.0

## 🐛 Troubleshooting

### ChromaDB Connection Failed
```bash
# Check if ChromaDB is running
curl http://localhost:8000/api/v1/heartbeat

# Restart ChromaDB
docker restart chromadb
```

### Indexing Fails
```bash
# Check file exists
ls -la data/employee-rules.txt

# Check OpenAI API key
echo $OPENAI_API_KEY
```

### RAG Returns Empty Results
```bash
# Verify collection exists
curl http://localhost:8000/api/v1/collections

# Re-index documents
npm run index-pdf
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
