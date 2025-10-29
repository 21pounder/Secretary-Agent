# Data Analyze Helper

An intelligent data analysis assistant built on the Mastra framework, integrating multiple specialized agents and MCP services to provide data analysis, trending news, sports information, train ticket queries, and more.

## 🌟 Features

### Multi-Agent Collaboration Architecture
- **Secretary Agent** - Main interface responsible for task routing and coordination
- **Data Analyze Agent** - Specialized in MySQL database queries and analysis
- **Hot News Agent** - Fetches trending topics from Chinese platforms (Zhihu, Weibo, Bilibili, etc.)

### Integrated MCP Services
- **Hot News MCP** - Trending news service based on Exa API
- **12306 MCP** - China Railway train ticket query service
- **DBHub MCP** - MySQL database connection and querying
- **BallDontLie MCP** - NBA/NFL/MLB/NHL/CBA sports data

### Core Capabilities
- 📊 Database queries and SQL analysis
- 📰 Trending news and topics from Chinese platforms
- ⚽ Multi-league sports news and statistics
- 🚄 Train ticket search and trip planning
- 🤖 Intelligent Agent-to-Agent collaboration (A2A)
- 💾 Conversation memory based on LibSQL

## 📋 Prerequisites

- **Node.js** >= 20.9.0
- **MySQL** database (if using data analysis features)
- API Keys for various services (see configuration below)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your configuration:

```bash
cp .env.example .env
```

Edit the `.env` file with the following configuration:

```env
# OpenAI API Configuration
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-your-actual-api-key

# EXA API (Hot News) - Get from https://exa.ai
EXA_API_KEY=your-exa-api-key

# BallDontLie API (Sports) - Get from https://balldontlie.com
BALLDONTLIE_API_KEY=your-balldontlie-api-key

# MySQL Database Connection
MYSQL_DSN=mysql://username:password@host:port/database?sslmode=disable
```

### 3. Run the Project

#### Development Mode
```bash
npm run dev
```

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
│       │   └── hot-news-agent.ts
│       ├── mcp/                 # MCP clients
│       │   ├── hot-news-client.ts
│       │   ├── 12306-client.ts
│       │   ├── mysql-client.ts
│       │   └── sport-news-client.ts
│       ├── config/              # Configuration files
│       │   └── config.ts
│       ├── tools/               # Tool definitions
│       ├── workflows/           # Workflows
│       ├── scorers/             # Scorers
│       └── index.ts             # Mastra instance
├── .env                         # Environment variables (not committed)
├── .env.example                 # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

## 🤖 Agent Overview

### Secretary Agent
Main entry point agent responsible for:
- Receiving user requests and intelligent routing
- Direct handling: train ticket queries, sports news
- Delegation: database analysis (→ Data Analyze Agent), Chinese trending topics (→ Hot News Agent)

### Data Analyze Agent
Professional data analysis agent capable of:
- Querying MySQL database table structures
- Executing SQL queries
- Analyzing data and providing insights
- Generating structured data reports

### Hot News Agent
Fetches trending topics from Chinese platforms:
- Zhihu Hot List
- Weibo Trending
- Bilibili Trending
- Douyin Trending
- Hupu, Douban, etc.

## 💡 Usage Examples

### Sports News Query
```
User: NFL today
→ Secretary Agent directly uses sport news tools
```

### Chinese Trending Topics Query
```
User: What's trending on Weibo today?
→ Secretary Agent → Hot News Agent → Returns trending list
```

### Database Analysis
```
User: Query sales data from tb_shop table
→ Secretary Agent → Data Analyze Agent → Executes SQL → Returns analysis report
```

### Train Ticket Query
```
User: High-speed train tickets from Beijing to Shanghai
→ Secretary Agent directly uses 12306 tools
```

## 🔧 MCP Service Configuration

All MCP service configurations are in `src/mastra/config/config.ts`, using environment variables for security.

Supported MCP services:
- `mcp-server-hotnews` - Exa news service
- `12306-mcp` - Train ticket service
- `dbhub` - MySQL database
- `balldontlie` - Sports data

## 📊 Data Persistence

The project uses **LibSQL** for data storage:
- Conversation memory storage
- Agent context management
- Observability data

Database files (`mastra.db`) are ignored in `.gitignore`.

## 🔒 Security Notes

- ✅ **Never** commit the `.env` file to Git
- ✅ All sensitive configurations use environment variables
- ✅ API Keys and database passwords removed from code
- ✅ `.gitignore` configured to ignore sensitive files

## 📝 Development Notes

### Agent-to-Agent Communication (A2A)
Using Mastra's Agent-to-Agent communication mechanism:
```typescript
agents: {
  dataAnalyzeAgent,
  hotNewsAgent,
}
```

### Task Routing Rules
Secretary Agent's routing logic:
1. **Direct handling**: Train tickets, sports news
2. **Delegate to Hot News Agent**: Chinese trending topics, trend analysis
3. **Delegate to Data Analyze Agent**: Database queries, SQL analysis

## 🛠️ Tech Stack

- **Framework**: [Mastra](https://mastra.ai) - Agent framework
- **AI Model**: OpenAI GPT-4o-mini
- **Database**: LibSQL (local storage), MySQL (data analysis)
- **Protocol**: MCP (Model Context Protocol)
- **Language**: TypeScript
- **Runtime**: Node.js >= 20.9.0

## 📄 License

ISC

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

**Built with ❤️ using [Mastra](https://mastra.ai)**

