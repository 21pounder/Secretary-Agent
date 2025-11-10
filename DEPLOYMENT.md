# Ubuntu 云服务器部署诊断指南

## 问题描述
端口 4111 启动失败，疑似 MCP 相关超时问题。

## 根本原因分析

项目使用了 **6 个 MCP 客户端**，其中部分需要外部依赖：

### 1. Python-based MCP 服务器（最可能的问题）

**问题服务器：**
- `mcp-server-hotnews`（使用 `uvx juhe-mcp-proxy`）
- `juhe-mcp-server`（使用 `uvx juhe-mcp-proxy`）
- `sport-news-client` 依赖于 `juhe-mcp-server`

**需要的依赖：**
```bash
# Ubuntu 上可能缺少 uv（Python 包管理器）
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

**验证是否安装：**
```bash
which uvx
# 如果显示 "command not found"，则需要安装 uv
```

---

### 2. NPX-based MCP 服务器

**问题服务器：**
- `12306-mcp`（火车票查询）
- `dbhub`（MySQL 数据库，**需要 MYSQL_DSN 环境变量**）
- `balldontlie-mcp`（体育数据，需要 BALLDONTLIE_API_KEY）
- `iching-mcp`（算命工具）

**潜在问题：**
- 首次运行时 `npx -y` 会自动下载 npm 包
- 如果网络慢或 npm registry 被墙，会超时（当前配置 120 秒）

**解决方案：**
```bash
# 配置 npm 国内镜像
npm config set registry https://registry.npmmirror.com

# 预先安装所有 MCP 包（避免首次启动超时）
npm install -g 12306-mcp
npm install -g @bytebase/dbhub
npm install -g balldontlie-mcp
npm install -g iching-mcp
```

---

### 3. 环境变量缺失

**必需的环境变量：**
```bash
# OpenAI API（所有 Agent 都需要）
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.vectorengine.ai/v1

# MySQL 数据库（Data Analyze Agent 需要）
MYSQL_DSN="mysql://user:password@host:3306/database"
# 或只读连接
MYSQL_DSN_READONLY="mysql://..."

# Mem0 长期记忆（Secretary Agent 需要）
MEM0_API_KEY=m0-...

# 可选：体育数据
BALLDONTLIE_API_KEY=...
```

**检查环境变量：**
```bash
# 在 Ubuntu 服务器上运行
cd /path/to/DataAnalyzeHelper
cat .env | grep -E "OPENAI_API_KEY|MYSQL_DSN|MEM0_API_KEY"
```

---

### 4. 网络与超时配置

当前配置已经增加超时到 120 秒：
```typescript
"UV_HTTP_TIMEOUT": "120"  // Python uv 超时
```

但如果服务器在国内且网络不稳定，可能仍然超时。

**建议：**
1. 使用国内 PyPI 镜像（已配置清华源）
2. 使用国内 npm 镜像（需手动配置）
3. 考虑禁用不需要的 MCP 服务器

---

## 快速诊断步骤

### 步骤 1：检查系统依赖

```bash
# 检查 Node.js 版本（需要 >= 20.9.0）
node --version

# 检查 Python（uv 需要 Python 环境）
python3 --version

# 检查 uv 是否安装
which uvx

# 检查 npm 镜像配置
npm config get registry
```

### 步骤 2：安装缺失依赖

```bash
# 如果 uv 未安装
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env

# 如果 npm 使用默认源（国外）
npm config set registry https://registry.npmmirror.com

# 预安装 MCP 包
npm install -g 12306-mcp @bytebase/dbhub balldontlie-mcp iching-mcp
```

### 步骤 3：验证环境变量

```bash
# 在项目目录下
cd /path/to/DataAnalyzeHelper

# 检查 .env 文件
cat .env

# 必须包含以下变量
grep OPENAI_API_KEY .env
grep MYSQL_DSN .env
grep MEM0_API_KEY .env
```

### 步骤 4：测试 MCP 连接

```bash
# 手动测试 Python-based MCP
uvx juhe-mcp-proxy https://mcp.juhe.cn/sse?token=MjbpXHGZu7dQgH9dsuFmFiiXnQcgZrxtriNep3VF3Y0EvC

# 手动测试 NPX-based MCP
npx -y 12306-mcp --help
npx -y iching-mcp --help
```

### 步骤 5：逐步启动项目

```bash
# 方案 A：直接启动（如果所有依赖都已安装）
npm run dev

# 方案 B：增加调试日志
DEBUG=* npm run dev

# 方案 C：临时禁用有问题的 MCP（修改 config.ts）
```

---

## 临时解决方案：禁用有问题的 MCP

如果某些 MCP 服务器持续超时，可以暂时禁用：

### 方案 1：注释掉有问题的 MCP 配置

编辑 `src/mastra/config/config.ts`：

```typescript
export const MCP_CONFIG = {
  servers: {
    // ❌ 如果 uv 未安装，注释掉这些
    // "mcp-server-hotnews": { ... },
    // "juhe-mcp-server": { ... },

    // ✅ 保留这些（基于 npx，更稳定）
    "12306-mcp": { ... },
    "dbhub": { ... },  // 需要 MYSQL_DSN
    "balldontlie": { ... },
    "wenyili-iching-mcp": { ... },
  }
};
```

### 方案 2：注释掉有问题的 MCP 客户端

编辑 `src/mastra/index.ts`：

```typescript
// import { hotNewsClient } from './mcp/hot-news-client';
// import { sportNewsClient } from './mcp/sport-news-client';
// import { suanmingClient } from './mcp/suanming-client';

export const mastra = new Mastra({
  // ...
});

// export { hotNewsClient, sportNewsClient, suanmingClient };
```

### 方案 3：修改相关 Agent 不使用有问题的 MCP

编辑 `src/mastra/agents/hot-news-agent.ts`：
- 移除 `hotNewsClient.getTools()` 调用
- 或添加错误捕获：
```typescript
let hotNewsTools = {};
try {
  hotNewsTools = await hotNewsClient.getTools();
} catch (error) {
  console.warn('⚠️  Hot News MCP 连接失败，跳过');
}
```

---

## 常见错误信息对照

### 错误 1：`uvx: command not found`
**原因：** 未安装 Python uv 包管理器
**解决：**
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.cargo/env
```

### 错误 2：`Connection timeout after 120s`
**原因：** 网络慢或 PyPI/npm 源被墙
**解决：**
```bash
# 配置镜像源（已在 config.ts 中配置了 PyPI 清华源）
npm config set registry https://registry.npmmirror.com
```

### 错误 3：`Error: MYSQL_DSN is required`
**原因：** 缺少 MySQL 连接配置
**解决：** 在 `.env` 中添加：
```bash
MYSQL_DSN="mysql://user:password@host:3306/database"
```

### 错误 4：`MCP initialization timeout`
**原因：** MCP 服务器启动超时
**解决：** 临时禁用该 MCP 或预安装对应的 npm 包

---

## 推荐部署配置

### 最小化 MCP 配置（只保留核心功能）

```typescript
// src/mastra/config/config.ts
export const MCP_CONFIG = {
  servers: {
    // 核心功能：MySQL 数据库（Data Analyze Agent）
    "dbhub": {
      "command": "npx",
      "args": ["-y", "@bytebase/dbhub", "--dsn", process.env.MYSQL_DSN || ""]
    },

    // 可选：火车票查询
    "12306-mcp": {
      "command": "npx",
      "args": ["-y", "12306-mcp"]
    },

    // 如果不需要热搜、体育数据、算命功能，可以注释掉其他服务器
  }
};
```

### 完整 MCP 配置（需要所有依赖）

如果需要所有功能，确保：
1. ✅ 安装 `uv`（Python 包管理器）
2. ✅ 配置 npm 国内镜像
3. ✅ 预安装所有 MCP npm 包
4. ✅ 设置所有环境变量

---

## 调试日志收集

如果问题仍未解决，收集以下信息：

```bash
# 1. 系统信息
uname -a
node --version
python3 --version
which uvx

# 2. npm 配置
npm config get registry
npm list -g --depth=0

# 3. 环境变量（注意不要泄露 API Key）
env | grep -E "OPENAI|MYSQL|MEM0|BALL"

# 4. 启动日志（保存到文件）
npm run dev > startup.log 2>&1
cat startup.log
```

---

## 联系与支持

如果上述方案都无法解决问题，请提供：
1. Ubuntu 版本：`lsb_release -a`
2. Node.js 版本：`node --version`
3. 启动日志：`npm run dev > startup.log 2>&1`
4. 已安装的依赖：`which uvx && npm list -g --depth=0`
