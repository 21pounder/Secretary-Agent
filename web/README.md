# DataAnalyzeHelper Web 前端

这是 DataAnalyzeHelper 的 Web 前端界面，提供现代化的聊天体验与 AI Agent 交互。

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite** - 快速开发服务器和构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Axios** - HTTP 客户端
- **React Markdown** - Markdown 渲染
- **Lucide React** - 现代图标库

## 功能特性

- 💬 实时聊天界面
- 📱 响应式设计（支持移动端和桌面端）
- 🌓 暗色模式支持
- ✨ Markdown 消息渲染
- 🔄 自动滚动到最新消息
- 🟢 后端连接状态指示
- ⌨️ 快捷键支持（Enter 发送，Shift+Enter 换行）
- 💡 智能提示建议

## 快速开始

### 前提条件

确保后端服务正在运行：

```bash
# 在项目根目录
cd ..
npm run dev  # 启动 Mastra 后端（默认端口 4111）
```

### 安装依赖

```bash
cd web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

前端将在 **http://localhost:3000** 运行

### 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/` 目录

### 预览生产构建

```bash
npm run preview
```

## API 配置

前端通过 Vite 代理连接后端 API：

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:4111',  // Mastra 后端地址
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

所有 `/api/*` 请求都会被代理到后端的 `http://localhost:4111`。

## 项目结构

```
web/
├── public/              # 静态资源
├── src/
│   ├── api/
│   │   └── client.ts   # Mastra API 客户端
│   ├── lib/
│   │   └── utils.ts    # 工具函数
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 应用入口
│   └── index.css       # 全局样式
├── index.html          # HTML 入口
├── vite.config.ts      # Vite 配置
├── tailwind.config.js  # Tailwind 配置
└── package.json
```

## 可用 Agents

前端可以与以下 Agent 交互（通过 Secretary Agent 路由）：

1. **Secretary Agent** - 主协调助手
   - 任务路由和管理
   - 火车票查询（12306）
   - 体育新闻查询
   - Mem0 记忆管理

2. **Data Analyze Agent** - 数据分析专家
   - MySQL 数据库查询
   - SQL 报表生成
   - 数据洞察分析

3. **Hot News Agent** - 热点新闻
   - 微博热搜
   - 知乎热榜
   - B站热门

4. **Employee Rules Agent** - 员工规章
   - 政策查询（RAG 驱动）
   - 员工手册问答
   - 规章制度解释

## 使用示例

在聊天框中输入以下问题试试：

- "查询数据库中的商品表有哪些字段？"
- "今天的 NBA 比赛结果"
- "微博现在有什么热搜？"
- "公司的请假政策是什么？"
- "帮我查询北京到上海的高铁"

## 故障排查

### 前端无法连接后端

1. 确保后端正在运行：`npm run dev`（在项目根目录）
2. 检查后端端口是否为 4111
3. 查看浏览器控制台是否有 CORS 错误

### 样式没有正确显示

1. 清除缓存：`rm -rf node_modules/.vite`
2. 重新安装依赖：`npm install`
3. 重启开发服务器

### TypeScript 错误

确保使用 Node.js >= 20.9.0：

```bash
node --version
```

## 开发建议

- 使用 VS Code 并安装以下扩展：
  - ESLint
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

- 代码格式化快捷键：`Shift + Alt + F`

## License

ISC
