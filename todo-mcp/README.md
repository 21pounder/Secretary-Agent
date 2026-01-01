# TODO MCP Server

一个基于 MCP（Model Context Protocol）的待办事项管理服务，可以通过与 LLM 对话来管理个人待办事项。

## 功能特性

- ✅ **create-todo**: 添加新的待办事项（标题、描述、截止日期、提醒时间）
- ✏️ **update-todo**: 修改已存在的待办事项（支持更新所有字段）
- 🗑️ **delete-todo**: 根据 ID 移除待办事项
- 📅 **get-upcoming-todos**: 查看未来指定天数内即将到期的任务
- 📋 **list-all-todos**: 列出所有待办事项（已完成/未完成）
- 📊 **get-stats**: 获取待办事项统计信息（总数、完成率、逾期等）
- 💾 **持久化存储**: 所有待办事项自动保存到 `todos.json` 文件

## 技术栈

- **TypeScript**: 类型安全的 JavaScript
- **MCP SDK**: Model Context Protocol 开发工具包
- **Zod**: 参数验证库
- **UUID**: 生成唯一标识符

## 项目结构

```
todo-mcp/
├── .vscode/
│   └── mcp.json          # VSCode MCP 配置文件
├── build/                # 编译输出目录
│   └── index.js
├── node_modules/         # 依赖包
├── src/
│   └── index.ts          # 源代码
├── package.json
├── tsconfig.json
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 启动服务

```bash
npm start
```

## 开发模式

使用 ts-node 直接运行 TypeScript 代码：

```bash
npm run dev
```

## 使用 Inspector 调试

MCP 官方提供了 Inspector 工具用于测试和调试：

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

然后在浏览器中打开 `http://127.0.0.1:6274/` 进行测试。

## VSCode 配置

项目已经包含了 `.vscode/mcp.json` 配置文件，可以直接在 VSCode 中使用此 MCP 服务。

配置文件示例：

```json
{
    "servers": {
        "todo-mcp": {
            "command": "node",
            "args": [
                "E:/todo-mcp/build/index.js"
            ]
        }
    }
}
```

## API 使用示例

### 创建待办事项

```
创建一个待办事项：
- 标题：完成项目报告
- 描述：需要包含数据分析和图表
- 截止日期：2025-11-01 18:00:00
- 提醒时间：2025-10-31 09:00:00
```

### 查看即将到期的任务

```
查看未来 7 天内即将到期的待办事项
```

### 更新待办事项

```
更新待办事项 [ID]，将标题改为"完成月度报告"
```

### 删除待办事项

```
删除待办事项 [ID]
```

### 查看所有待办事项

```
查看我的所有待办事项
```

### 获取统计信息

```
查看我的待办事项统计
```

## 发布到 NPM

1. 登录 NPM：
```bash
npm login
```

2. 发布包：
```bash
npm publish
```

3. 更新版本：
```bash
npm version patch  # 0.1.0 -> 0.1.1 (bug 修复)
npm version minor  # 0.1.1 -> 0.2.0 (新功能)
npm version major  # 0.2.0 -> 1.0.0 (破坏性更改)
```

## 使用已发布的包

如果包已发布到 NPM，可以使用 npx 命令远程调用：

```bash
npx todo-mcp
```

## 注意事项

- ✅ 待办事项已自动保存到 `todos.json` 文件，重启服务后数据不会丢失
- 📂 数据文件位置：项目根目录下的 `todos.json`
- 📅 日期格式：`YYYY-MM-DD HH:mm:ss`（例如：2025-05-04 14:30:00）
- ⏰ 截止日期和提醒时间不能早于当前时间
- 🔄 每次创建、更新、删除操作都会自动保存到文件

## 许可证

ISC

