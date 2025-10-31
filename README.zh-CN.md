
# Data Analyze Helper (数据分析助手)

基于 Mastra 框架构建的智能多智能体助手，集成 RAG（检索增强生成）、数据分析、热点新闻、体育资讯等功能。

[English Documentation](./README.md)

## 🌟 功能特性

### 多智能体协作架构
- **Secretary Agent（秘书智能体）** - 主协调者，负责任务路由和管理
- **Data Analyze Agent（数据分析智能体）** - MySQL 数据库查询和分析专家
- **Hot News Agent（热点新闻智能体）** - 中文平台热点话题（知乎、微博、B站等）
- **Employee Rules Agent（员工手册智能体）** - 基于 RAG 的 HR 政策和手册助手

### 集成的 MCP 服务
- **Hot News MCP** - 通过 Exa API 获取热点新闻
- **12306 MCP** - 中国铁路火车票查询
- **DBHub MCP** - MySQL 数据库连接
- **BallDontLie MCP** - 多联赛体育数据（NBA/NFL/MLB/NHL/CBA）

### 核心能力
- 📊 数据库查询和 SQL 分析
- 📰 中文平台实时热点新闻
- ⚽ 多联赛体育统计数据
- 🚄 火车票搜索和行程规划
- 📖 **基于 RAG 的员工手册智能问答（ChromaDB）**
- 🤖 智能体间协作（A2A）
- 💾 基于 LibSQL 的对话记忆

## 📋 前置要求

- **Node.js** >= 20.9.0
- **MySQL**（可选，用于数据分析功能）
- **ChromaDB**（用于 RAG 功能，可通过 Docker 运行）
- 各种服务的 API Keys（见配置部分）

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 环境配置

复制 `env.example` 为 `.env`：

```bash
cp env.example .env
```

编辑 `.env` 文件，填入你的配置：

```env
# OpenAI API 配置
OPENAI_API_KEY=sk-your-actual-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# Chroma 向量数据库（用于 RAG）
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_COLLECTION=employee_rules

# EXA API（热点新闻）- 从 https://exa.ai 获取
EXA_API_KEY=your-exa-api-key

# BallDontLie API（体育）- 从 https://balldontlie.com 获取
BALLDONTLIE_API_KEY=your-balldontlie-api-key

# MySQL 数据库连接（可选）
MYSQL_DSN=mysql://username:password@host:port/database?sslmode=disable
```

### 3. 配置 ChromaDB（RAG 功能必需）

#### 方式 A：Docker（推荐）

```bash
docker run -d -p 8000:8000 \
  -v ./chroma-data:/chroma/chroma \
  --name chromadb \
  chromadb/chroma:latest
```

#### 方式 B：Python 安装

```bash
pip install chromadb
chroma run --host localhost --port 8000 --path ./chroma-data
```

### 4. 索引员工手册（首次配置）

将你的员工手册文档放在 `data/employee-rules.txt` 或 `data/employee-rules.pdf`，然后运行：

```bash
npm run index-pdf
```

预期输出：
```
🚀 开始索引员工规则文档...
📄 读取文档: data/employee-rules.txt
📚 提取了 10000+ 字符
✂️  分割成 28 个块
🧮 生成嵌入向量...
✅ 生成了 28 个嵌入向量
📦 索引到 Chroma: employee_rules
✅ 索引完成！
```

### 5. 运行项目

#### 开发模式
```bash
npm run dev
```

服务将在 `http://localhost:4111` 启动

#### 生产构建
```bash
npm run build
npm start
```

## 🏗️ 项目结构

```
DataAnalyzeHelper/
├── src/
│   └── mastra/
│       ├── agents/              # 智能体定义
│       │   ├── secretary-agent.ts
│       │   ├── data-analyze-agent.ts
│       │   ├── hot-news-agent.ts
│       │   └── employee-ruler-agent.ts  # RAG 智能体
│       ├── mcp/                 # MCP 客户端
│       │   ├── hot-news-client.ts
│       │   ├── 12306-client.ts
│       │   ├── mysql-client.ts
│       │   └── sport-news-client.ts
│       ├── config/              # 配置文件
│       ├── tools/               # 自定义工具
│       ├── workflows/           # 工作流
│       └── index.ts             # Mastra 实例
├── data/                        # RAG 文档
│   └── employee-rules.txt
├── scripts/                     # 工具脚本
│   └── index-pdf.ts             # 文档索引脚本
├── chroma-data/                 # ChromaDB 存储（已忽略）
├── env.example                  # 环境变量模板
├── package.json
└── README.md
```

## 🤖 智能体概览

### Secretary Agent（秘书智能体）
主协调者，负责：
- 接收和路由用户请求
- 直接处理：火车票、体育新闻
- 委派任务：数据分析、热点新闻、HR 政策

### Data Analyze Agent（数据分析智能体）
专业数据分析师，能够：
- 查询 MySQL 数据库结构
- 执行 SQL 查询
- 分析数据并生成洞察
- 创建结构化数据报告

### Hot News Agent（热点新闻智能体）
获取热点话题：
- 知乎热榜
- 微博热搜
- B站热门
- 抖音、虎扑、豆瓣等

### Employee Rules Agent（员工手册智能体 - RAG）
AI 驱动的 HR 助手功能：
- **向量搜索**：使用 ChromaDB 进行语义相似度搜索
- **混合检索**：结合向量搜索 + 关键词匹配
- **多召回源**：使用 RRF（倒数排名融合）提高准确率
- **双语支持**：中文和英文查询
- **来源引用**：始终引用手册原文

## 💡 使用示例

### 员工手册查询（RAG）
```
用户：公司有哪些假期类型？
→ Secretary Agent → Employee Rules Agent → RAG 搜索 → 返回 7 种假期类型及引用
```

### 体育新闻
```
用户：今天 NBA 比赛结果
→ Secretary Agent → 体育新闻工具 → 返回今日 NBA 比赛
```

### 热点话题
```
用户：微博热搜有什么？
→ Secretary Agent → Hot News Agent → 返回微博热搜榜
```

### 数据库分析
```
用户：查询 tb_shop 表的销售数据
→ Secretary Agent → Data Analyze Agent → 执行 SQL → 分析报告
```

### 火车票查询
```
用户：北京到上海的高铁
→ Secretary Agent → 12306 工具 → 返回可用车次
```

## 🔬 RAG 系统架构

```
用户提问
    ↓
Employee Rules Agent
    ↓
多召回源检索（混合搜索）
    ├─→ 向量搜索（语义理解）
    ├─→ 关键词搜索（精确匹配）
    └─→ RRF 融合
         ↓
ChromaDB（向量数据库）
    ↓
Top-K 相关文档块
    ↓
GPT-4o-mini（答案生成）
    ↓
结构化答案 + 原文引用
```

### RAG 优化特性

1. **混合检索**
   - 向量搜索：语义理解
   - 关键词提取：精确匹配
   - RRF 融合：最优结果

2. **智能分块**
   - 块大小：512 字符
   - 重叠：50 字符
   - 保持上下文连续性

3. **嵌入模型**
   - 模型：`text-embedding-3-small`
   - 维度：1536
   - 提供商：OpenAI

4. **响应质量**
   - 直接引用原文
   - 语言匹配（中文 ↔ 英文）
   - 清晰的"未找到"处理

## 🔧 MCP 服务配置

所有 MCP 配置位于 `src/mastra/config/config.ts`，使用环境变量。

支持的服务：
- `mcp-server-hotnews` - 新闻服务（Exa）
- `12306-mcp` - 火车票查询
- `dbhub` - MySQL 数据库
- `balldontlie` - 体育数据

## 📊 数据持久化

### LibSQL（对话记忆）
- 位置：`mastra.db`（已在 git 中忽略）
- 存储：智能体对话、上下文、可观测性数据

### ChromaDB（向量存储）
- 位置：`chroma-data/`（已在 git 中忽略）
- 存储：文档嵌入向量、元数据
- 持久化：通过 Docker volume 或本地目录

## 🔒 安全最佳实践

✅ **应该做**：
- 所有敏感信息使用环境变量
- 保持 `.env` 文件不被提交到版本控制
- 使用 `env.example` 作为模板
- 定期轮换 API 密钥

❌ **不应该做**：
- 将 `.env` 提交到 Git
- 在源代码中硬编码 API 密钥
- 在公共仓库分享凭证
- 在开发环境使用生产密钥

## 📝 开发说明

### 添加新文档到 RAG

1. 将文档放在 `data/` 目录（`.txt` 或 `.pdf`）
2. 如需要，更新 `employee-ruler-agent.ts` 中的文件路径
3. 运行索引：`npm run index-pdf`
4. 重启服务：`npm run dev`

### 自定义 RAG 参数

在 `src/mastra/agents/employee-ruler-agent.ts` 中：

```typescript
// 块大小和重叠
maxSize: 512,     // 增加以获得更多上下文
overlap: 50,      // 增加以提高连续性

// Top-K 结果数
topK: 5,          // 检索的文档块数量
```

### 智能体间通信

Mastra 的 A2A 机制实现无缝委派：

```typescript
agents: {
  secretaryAgent,
  dataAnalyzeAgent,
  hotNewsAgent,
  employeeRulerAgent,  // 自动注册用于 A2A
}
```

## 🛠️ 技术栈

- **框架**：[Mastra](https://mastra.ai) - AI 智能体框架
- **AI 模型**：OpenAI GPT-4o-mini
- **向量数据库**：ChromaDB
- **嵌入模型**：OpenAI text-embedding-3-small
- **数据库**：LibSQL（本地）、MySQL（分析）
- **协议**：MCP（模型上下文协议）
- **语言**：TypeScript
- **运行时**：Node.js >= 20.9.0

## 🐛 故障排查

### ChromaDB 连接失败
```bash
# 检查 ChromaDB 是否运行
curl http://localhost:8000/api/v1/heartbeat

# 重启 ChromaDB
docker restart chromadb
```

### 索引失败
```bash
# 检查文件是否存在
ls -la data/employee-rules.txt

# 检查 OpenAI API Key
echo $OPENAI_API_KEY
```

### RAG 返回空结果
```bash
# 验证集合是否存在
curl http://localhost:8000/api/v1/collections

# 重新索引文档
npm run index-pdf
```

## 📄 许可证

ISC

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

请确保：
- 提交中不包含敏感数据
- 同时更新 README.md 和 README.zh-CN.md
- 更改后测试 RAG 功能

---

**使用 [Mastra](https://mastra.ai) 用 ❤️ 构建**
