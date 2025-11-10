/**
 * Ubuntu 云服务器最小化配置
 *
 * 用途：如果某些 MCP 服务器无法正常启动（如 uv 未安装），可以使用此配置
 * 使用方法：将此文件内容复制到 src/mastra/config/config.ts
 *
 * 功能对比：
 * ✅ 保留：MySQL 数据库分析、火车票查询、体育数据、算命
 * ❌ 禁用：热搜新闻（需要 uv）
 */

export const MCP_CONFIG = {
  servers: {
    // =====================================================
    // 核心功能（推荐保留）
    // =====================================================

    /**
     * MySQL 数据库客户端
     * 用于：Data Analyze Agent（数据库查询和分析）
     * 依赖：npm 包 @bytebase/dbhub
     * 环境变量：MYSQL_DSN（必需）
     */
    "dbhub": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        process.env.MYSQL_DSN || ""
      ]
    },

    // =====================================================
    // 可选功能（稳定，基于 npx）
    // =====================================================

    /**
     * 12306 火车票查询
     * 用于：Secretary Agent（火车票查询）
     * 依赖：npm 包 12306-mcp
     * 环境变量：无
     */
    "12306-mcp": {
      "command": "npx",
      "args": ["-y", "12306-mcp"]
    },

    /**
     * BallDontLie 体育数据
     * 用于：Secretary Agent（NBA/NFL/MLB 等体育数据）
     * 依赖：npm 包 balldontlie-mcp
     * 环境变量：BALLDONTLIE_API_KEY（可选）
     */
    "balldontlie": {
      "command": "npx",
      "args": ["-y", "balldontlie-mcp"],
      "env": {
        "BALLDONTLIE_API_KEY": process.env.BALLDONTLIE_API_KEY || ""
      }
    },

    /**
     * 易经算命工具
     * 用于：Suanming Client（算命功能）
     * 依赖：npm 包 iching-mcp
     * 环境变量：无
     */
    "wenyili-iching-mcp": {
      "command": "npx",
      "args": ["-y", "iching-mcp"]
    },

    // =====================================================
    // 问题功能（需要 uv，已禁用）
    // =====================================================

    /**
     * ❌ 热搜新闻（已禁用）
     * 原因：需要 Python uv 包管理器（uvx 命令）
     * 如需启用：
     * 1. 安装 uv: curl -LsSf https://astral.sh/uv/install.sh | sh
     * 2. 取消下面的注释
     */
    // "mcp-server-hotnews": {
    //   "command": "uvx",
    //   "args": [
    //     "juhe-mcp-proxy",
    //     "https://mcp.juhe.cn/sse?token=MjbpXHGZu7dQgH9dsuFmFiiXnQcgZrxtriNep3VF3Y0EvC"
    //   ],
    //   "env": {
    //     "LOG_LEVEL": "CRITICAL",
    //     "UV_HTTP_TIMEOUT": "120",
    //     "UV_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple",
    //     "PIP_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple"
    //   }
    // },

    /**
     * ❌ 体育新闻（已禁用）
     * 原因：需要 Python uv 包管理器（uvx 命令）
     * 如需启用：
     * 1. 安装 uv: curl -LsSf https://astral.sh/uv/install.sh | sh
     * 2. 取消下面的注释
     */
    // "juhe-mcp-server": {
    //   "command": "uvx",
    //   "args": [
    //     "juhe-mcp-proxy",
    //     "https://mcp.juhe.cn/sse?token=MjbpXHGZu7dQgH9dsuFmFiiXnQcgZrxtriNep3VF3Y0EvC"
    //   ],
    //   "env": {
    //     "LOG_LEVEL": "CRITICAL",
    //     "UV_HTTP_TIMEOUT": "120",
    //     "UV_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple",
    //     "PIP_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple"
    //   }
    // },
  }
};
