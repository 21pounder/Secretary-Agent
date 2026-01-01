
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
- **12306 MCP** - 中国铁路火车票查询（当前已禁用）
- **DBHub MCP** - MySQL 数据库连接
- **BallDontLie MCP** - 多联赛体育数据（NBA/NFL/MLB/NHL/CBA）
- **TODO MCP** - 通过自然语言管理个人待办事项（当前已禁用）

### 核心能力
- 📊 数据库查询和 SQL 分析
- 📰 中文平台实时热点新闻
- ⚽ 多联赛体育统计数据
- 🚄 火车票搜索和行程规划
- 📖 **基于 RAG 的智能问答（Milvus 向量数据库）**（员工手册 & 知识库）
- 🤖 智能体间协作（A2A）
- 💾 基于 LibSQL 的对话记忆
- ✅ 个人待办事项管理（TODO MCP - 当前已禁用）

## 📋 前置要求

- **Node.js** >= 20.9.0
- **MySQL**（可选，用于数据分析功能）
- **Milvus**（用于 RAG 功能，可通过 Docker 运行）
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

# Milvus 向量数据库（用于 RAG）
MILVUS_HOST=localhost
MILVUS_PORT=19530
EMPLOYEE_RULES_COLLECTION=employee_rules
MILVUS_COLLECTION=knowledge_book

# Redis 缓存（可选，用于查询缓存）
REDIS_HOST=localhost
REDIS_PORT=6379

# EXA API（热点新闻）- 从 https://exa.ai 获取
EXA_API_KEY=your-exa-api-key

# BallDontLie API（体育）- 从 https://balldontlie.com 获取
BALLDONTLIE_API_KEY=your-balldontlie-api-key

# MySQL 数据库连接（可选）
MYSQL_DSN=mysql://username:password@host:port/database?sslmode=disable
```

### 3. 配置 Milvus（RAG 功能必需）

#### Docker（推荐）

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

# Redis（用于缓存）
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest
```

### 4. 索引文档（首次配置）

#### 索引员工手册

将员工手册放在 `data/employee-rules.txt`（或 `.pdf`），然后运行：

```bash
npm run index-pdf
```

#### 索引知识库

将知识库内容放在 `data/dmbj.txt`，然后运行：

```bash
npm run index-dmbj
```

预期输出：
```
📘 员工手册索引工具 (Milvus)
📍 Milvus 地址: localhost:19530
📂 Collection: employee_rules
✂️  分割成 28 个块
🧮 生成嵌入向量...
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
├── milvus-data/                 # Milvus 存储（如本地部署，已忽略）
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
- **向量搜索**：使用 Milvus 进行语义相似度搜索
- **智能缓存**：基于 Redis 的查询缓存，相似度匹配
- **查询优化**：查询改写和重排序，提高准确率
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
Redis 缓存检查（相似度匹配）
    ↓ [缓存未命中]
查询改写（可选）
    ↓
向量搜索（Milvus）
    ↓
重排序（可选）
    ↓
Top-K 相关文档块
    ↓
GPT-4o-mini（答案生成）
    ↓
结构化答案 + 原文引用
    ↓
缓存结果
```

### RAG 优化特性

1. **智能缓存**
   - 基于 Redis 的查询缓存
   - 相似度匹配（余弦相似度 > 0.95）
   - TTL：1 小时（可配置）

2. **查询改写**（可选）
   - 生成多个查询变体
   - 提高检索召回率
   - 可配置数量（默认：2）

3. **重排序**（可选）
   - Auto：简单查询 → 嵌入，复杂查询 → LLM
   - Embedding：快速余弦相似度重排
   - LLM：GPT-4o-mini 语义评分

4. **智能分块**
   - 块大小：512 字符
   - 重叠：50 字符
   - 保持上下文连续性

5. **嵌入模型**
   - 模型：`text-embedding-3-small`
   - 维度：1536
   - 提供商：OpenAI

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

### Milvus（向量存储）
- Docker 容器，持久化卷
- 存储：文档嵌入向量（员工手册 + 知识库）
- 集合：`employee_rules`、`knowledge_book`
- 索引：IVF_FLAT，L2 距离

### Redis（查询缓存）
- Docker 容器
- 存储：查询嵌入向量和结果
- TTL：每个查询 1 小时

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
- **向量数据库**：Milvus
- **缓存**：Redis
- **嵌入模型**：OpenAI text-embedding-3-small
- **数据库**：LibSQL（本地）、MySQL（分析）
- **协议**：MCP（模型上下文协议）
- **语言**：TypeScript
- **运行时**：Node.js >= 20.9.0

## 🐛 故障排查

### Milvus 连接失败
```bash
# 检查 Milvus 是否运行
docker ps | grep milvus

# 重启 Milvus
docker restart milvus-standalone

# 检查 Milvus 日志
docker logs milvus-standalone
```

### 索引失败
```bash
# 检查文件是否存在
ls -la data/employee-rules.txt
ls -la data/dmbj.txt

# 检查 OpenAI API Key
echo $OPENAI_API_KEY

# 重新运行索引
npm run index-pdf      # 员工手册
npm run index-dmbj     # 知识库
```

### RAG 返回空结果
```bash
# 检查集合是否存在（使用 Python）
from pymilvus import connections, utility
connections.connect(host='localhost', port='19530')
print(utility.list_collections())

# 重新索引文档
npm run index-pdf
npm run index-dmbj
```

### Redis 缓存问题
```bash
# 检查 Redis 连接
docker ps | grep redis
redis-cli -h localhost -p 6379 ping

# 清空缓存
redis-cli -h localhost -p 6379 FLUSHDB
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
