# Ubuntu 云服务器部署问题 - 已修复

## 问题诊断

您的 Ubuntu 云服务器上端口 4111 无法启动的根本原因是：**MCP (Model Context Protocol) 客户端初始化失败**。

原代码在 Agent 模块加载时直接 `await` MCP 客户端的 `getTools()` 方法，任何一个 MCP 失败都会导致整个应用启动失败。

---

## 已完成的修复

我已经修改了以下文件，添加了**错误容错机制**：

### 1. `src/mastra/agents/secretary-agent.ts`
- ✅ 添加了 try-catch 包裹 `sportNewsClient.getTools()`
- ✅ 添加了 try-catch 包裹 `railWay12306Client.getTools()`
- ✅ 添加了 try-catch 包裹 `suanmingClient.getTools()`
- **效果**：如果这些 MCP 失败，会显示警告但不会阻止启动

### 2. `src/mastra/agents/hot-news-agent.ts`
- ✅ 添加了 try-catch 包裹 `hotNewsClient.getTools()`
- **效果**：如果 Hot News MCP 失败（缺少 `uv`），会跳过但不影响其他功能

### 3. `src/mastra/agents/data-analyze-agent.ts`
- ✅ 添加了 try-catch 包裹 `mysqlClient.getTools()`
- **效果**：如果 MySQL 连接失败（缺少 `MYSQL_DSN`），Agent 会降级运行

---

## 现在的行为

修复后，应用启动时会：

```
🔌 正在连接 Sport News MCP...
⚠️  Sport News MCP 连接失败，跳过: uvx: command not found
   提示：如果缺少 uv，运行: curl -LsSf https://astral.sh/uv/install.sh | sh

🔌 正在连接 12306 Railway MCP...
✅ 12306 Railway MCP 连接成功

🔌 正在连接 Suanming MCP...
✅ Suanming MCP 连接成功

🔌 正在连接 Hot News MCP...
⚠️  Hot News MCP 连接失败，跳过: uvx: command not found

🔌 正在连接 MySQL Database MCP...
✅ MySQL Database MCP 连接成功

✅ Mastra server started on http://localhost:4111
```

**关键改进**：即使部分 MCP 失败，服务器仍然能启动！

---

## 在 Ubuntu 服务器上的部署步骤

### 步骤 1：上传修复后的代码

```bash
# 在本地（Windows）
git add .
git commit -m "fix: 添加 MCP 错误容错机制"
git push

# 在 Ubuntu 服务器上
cd /path/to/DataAnalyzeHelper
git pull
```

### 步骤 2：运行诊断脚本

我已经为您创建了自动诊断脚本：

```bash
# 添加执行权限
chmod +x scripts/diagnose-ubuntu.sh

# 运行诊断
./scripts/diagnose-ubuntu.sh
```

这个脚本会自动检查：
- ✅ Node.js 版本
- ✅ Python3 和 uv 是否安装
- ✅ npm 镜像配置
- ✅ MCP 依赖包
- ✅ 环境变量配置
- ✅ 数据库连接（ChromaDB, Milvus, Redis）
- ✅ 端口占用情况

### 步骤 3：安装缺失的依赖（根据诊断结果）

#### 如果缺少 `uv`（Python 包管理器）：

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

#### 如果 npm 使用国外源（会超时）：

```bash
npm config set registry https://registry.npmmirror.com
```

#### （可选）预安装 MCP 包：

```bash
npm install -g 12306-mcp @bytebase/dbhub balldontlie-mcp iching-mcp
```

### 步骤 4：配置环境变量

确保 `.env` 文件包含以下必需变量：

```bash
# 编辑 .env
vim .env
```

必需的环境变量：
```env
# OpenAI API（所有 Agent 都需要）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.vectorengine.ai/v1

# MySQL 数据库（Data Analyze Agent 需要）
MYSQL_DSN="mysql://user:password@host:3306/database"

# Mem0 长期记忆（Secretary Agent 需要）
MEM0_API_KEY=m0-...

# 可选服务
BALLDONTLIE_API_KEY=...  # 体育数据
```

### 步骤 5：启动服务

```bash
# 方式 1：直接启动
npm run dev

# 方式 2：后台运行（推荐生产环境）
nohup npm run dev > app.log 2>&1 &

# 方式 3：使用 pm2（推荐）
npm install -g pm2
pm2 start "npm run dev" --name dataanalyze-helper
pm2 logs dataanalyze-helper
```

### 步骤 6：验证服务

```bash
# 检查端口是否启动
curl http://localhost:4111

# 查看启动日志
tail -f app.log  # 如果使用 nohup
pm2 logs dataanalyze-helper  # 如果使用 pm2
```

---

## 已创建的辅助文件

### 1. `DEPLOYMENT.md`
- 完整的部署诊断指南
- 常见错误解决方案
- 环境配置说明

### 2. `scripts/diagnose-ubuntu.sh`
- 自动化诊断脚本
- 检查所有依赖和配置
- 提供修复建议

### 3. `config.minimal.ts`
- 最小化 MCP 配置（如果仍然有问题）
- 只保留核心功能（MySQL, 12306, 算命）
- 禁用需要 `uv` 的服务（热搜新闻）

### 4. `MCP_FIX.md`
- MCP 错误处理的详细说明
- 代码修改示例

---

## 预期结果

修复后，您的应用应该能够：

✅ **成功启动**，即使部分 MCP 失败
✅ **核心功能可用**：
  - MySQL 数据库分析（如果配置了 `MYSQL_DSN`）
  - 天气查询（无需 MCP）
  - Mem0 长期记忆（如果配置了 `MEM0_API_KEY`）
  - 员工手册查询（ChromaDB RAG）
  - 知识库查询（Milvus RAG）

⚠️ **部分功能可能不可用**（取决于依赖是否安装）：
  - 热搜新闻（需要 `uv`）
  - 火车票查询（需要 `npx 12306-mcp`）
  - 体育数据（需要 `npx balldontlie-mcp`）
  - 算命功能（需要 `npx iching-mcp`）

---

## 如果问题仍然存在

### 收集日志

```bash
# 启动并保存日志
npm run dev > startup.log 2>&1

# 查看日志
cat startup.log

# 查找错误
grep -i "error\|failed\|timeout" startup.log
```

### 检查防火墙

```bash
# 检查端口 4111 是否被防火墙阻止
sudo ufw status
sudo ufw allow 4111/tcp
```

### 使用最小化配置

如果仍然失败，可以使用最小化配置：

```bash
# 备份原配置
cp src/mastra/config/config.ts src/mastra/config/config.backup.ts

# 使用最小化配置
cp config.minimal.ts src/mastra/config/config.ts

# 重新启动
npm run dev
```

---

## 下一步建议

1. **验证修复**：在 Ubuntu 服务器上 `git pull` 并运行 `npm run dev`
2. **运行诊断**：执行 `./scripts/diagnose-ubuntu.sh` 检查环境
3. **安装缺失依赖**：根据诊断结果安装 `uv` 或其他依赖
4. **配置生产环境**：使用 `pm2` 进行进程管理

需要任何帮助请告诉我！
