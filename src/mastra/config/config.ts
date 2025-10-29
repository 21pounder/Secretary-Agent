export const MCP_CONFIG = {
  servers: {
    "mcp-server-hotnews": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": {
        "EXA_API_KEY": process.env.EXA_API_KEY || ""
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
    }
  }
};