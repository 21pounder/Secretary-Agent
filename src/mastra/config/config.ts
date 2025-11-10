export const MCP_CONFIG = {
  servers: {
    "mcp-server-hotnews": {
      "command": "uvx",
      "args": [
        "juhe-mcp-proxy",
        "https://mcp.juhe.cn/sse?token=MjbpXHGZu7dQgH9dsuFmFiiXnQcgZrxtriNep3VF3Y0EvC"
      ],
      "env": {
        "LOG_LEVEL": "CRITICAL",
        "UV_HTTP_TIMEOUT": "120",  // 增加超时时间到 120 秒
        "UV_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple",  // 使用清华镜像源
        "PIP_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple"
      }
    },
    "12306-mcp": {
      "command": "npx",
      "args": [
          "-y",
          "12306-mcp"
      ]
  },
  "dbhub": {
      "command": "npx",
      "args": [
        "-y",
        "@bytebase/dbhub",
        "--dsn",
        process.env.MYSQL_DSN || ""
      ]
    },
    "balldontlie": {
      "command": "npx",
      "args": [
        "-y",
        "balldontlie-mcp"
      ],
      "env": {
        "BALLDONTLIE_API_KEY": process.env.BALLDONTLIE_API_KEY || ""
      }
    },
    "wenyili-iching-mcp": {
      "args": [
        "-y",
        "iching-mcp"
      ],
      "command": "npx"
    },
    "juhe-mcp-server": {
    "command": "uvx",
    "args": [
      "juhe-mcp-proxy",
      "https://mcp.juhe.cn/sse?token=MjbpXHGZu7dQgH9dsuFmFiiXnQcgZrxtriNep3VF3Y0EvC"
    ],
    "env": {
      "LOG_LEVEL": "CRITICAL",
      "UV_HTTP_TIMEOUT": "120",  // 增加超时时间到 120 秒
      "UV_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple",  // 使用清华镜像源
      "PIP_INDEX_URL": "https://pypi.tuna.tsinghua.edu.cn/simple"
    }
  },
    
  }
};