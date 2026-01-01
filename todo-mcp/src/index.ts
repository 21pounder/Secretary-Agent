#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// 数据文件路径
const DATA_FILE = join(process.cwd(), "todos.json");

// 存储待办事项
const todos = new Map<string, TodoItem>();

interface TodoItem {
    id: string;
    title: string;
    description: string;
    dueDate: Date;
    reminder?: Date;
    completed: boolean;
    createdAt: Date;
}

interface TodoItemSerialized {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    reminder?: string;
    completed: boolean;
    createdAt: string;
}

// 加载待办事项从文件
function loadTodos(): void {
    try {
        if (existsSync(DATA_FILE)) {
            const data = readFileSync(DATA_FILE, "utf-8");
            const items: TodoItemSerialized[] = JSON.parse(data);
            items.forEach(item => {
                todos.set(item.id, {
                    ...item,
                    dueDate: new Date(item.dueDate),
                    reminder: item.reminder ? new Date(item.reminder) : undefined,
                    createdAt: new Date(item.createdAt)
                });
            });
            console.error(`✅ 已加载 ${items.length} 条待办事项`);
        } else {
            console.error("📝 首次启动，创建新的待办列表");
        }
    } catch (error) {
        console.error("⚠️ 加载待办事项失败:", error);
    }
}

// 保存待办事项到文件
function saveTodos(): void {
    try {
        const items: TodoItemSerialized[] = Array.from(todos.values()).map(item => ({
            id: item.id,
            title: item.title,
            description: item.description,
            dueDate: item.dueDate.toISOString(),
            reminder: item.reminder?.toISOString(),
            completed: item.completed,
            createdAt: item.createdAt.toISOString()
        }));
        writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
    } catch (error) {
        console.error("⚠️ 保存待办事项失败:", error);
    }
}

// 日期验证和转换函数
function parseAndValidateDate(dateStr: string, fieldName: string): string {
    if (!dateStr) {
        throw new Error(`${fieldName}不能为空`);
    }
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
        throw new Error(`${fieldName}格式无效，请使用 YYYY-MM-DD HH:mm:ss 格式，例如：2025-05-04 14:30:00`);
    }
    if (parsed < new Date()) {
        throw new Error(`${fieldName}不能早于当前时间`);
    }
    return parsed.toISOString();
}

// 工具参数验证 Schema
const createTodoSchema = z.object({
    title: z.string().min(1, "标题不能为空"),
    description: z.string(),
    dueDate: z.string()
        .transform((dateStr: string) => parseAndValidateDate(dateStr, "截止日期")),
    reminder: z.string()
        .transform((dateStr: string) => parseAndValidateDate(dateStr, "提醒时间"))
        .optional()
});

const updateTodoSchema = z.object({
    id: z.string(),
    title: z.string().min(1, "标题不能为空").optional(),
    description: z.string().optional(),
    dueDate: z.string()
        .transform((dateStr: string) => parseAndValidateDate(dateStr, "截止日期"))
        .optional(),
    reminder: z.string()
        .transform((dateStr: string) => {
            if (dateStr === null) return null;
            return parseAndValidateDate(dateStr, "提醒时间");
        })
        .nullable()
        .optional(),
    completed: z.boolean().optional()
});

const deleteTodoSchema = z.object({
    id: z.string()
});

const getUpcomingSchema = z.object({
    days: z.number().int().positive().default(7)
});

const listAllTodosSchema = z.object({});

const getStatsSchema = z.object({});

// 创建服务器
const server = new McpServer({
    name: "todo-manager",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {
            "create-todo": {
                description: "创建新的待办事项",
                parameters: createTodoSchema.shape
            },
            "update-todo": {
                description: "更新现有待办事项",
                parameters: updateTodoSchema.shape
            },
            "delete-todo": {
                description: "删除待办事项",
                parameters: deleteTodoSchema.shape
            },
            "get-upcoming-todos": {
                description: "获取即将到期的待办事项",
                parameters: getUpcomingSchema.shape
            },
            "list-all-todos": {
                description: "列出所有待办事项",
                parameters: listAllTodosSchema.shape
            },
            "get-stats": {
                description: "获取待办事项统计信息",
                parameters: getStatsSchema.shape
            }
        }
    }
});

// 创建待办事项
server.tool("create-todo", createTodoSchema.shape, async (args, extra) => {
    try {
        const { title, description, dueDate, reminder } = args;
        const id = uuidv4();
        const item: TodoItem = {
            id,
            title,
            description,
            dueDate: new Date(dueDate),
            reminder: reminder ? new Date(reminder) : undefined,
            completed: false,
            createdAt: new Date()
        };
        todos.set(id, item);
        saveTodos(); // 保存到文件
        return {
            content: [
                {
                    type: "text",
                    text: `✅ 成功创建待办事项: ${id}\n\n标题: ${title}\n描述: ${description}\n截止日期: ${item.dueDate.toLocaleString('zh-CN')}${reminder ? `\n提醒时间: ${item.reminder?.toLocaleString('zh-CN')}` : ''}`
                }
            ]
        };
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `❌ 创建待办事项失败: ${error instanceof Error ? error.message : String(error)}`
                }
            ],
            isError: true
        };
    }
});

// 更新待办事项
server.tool("update-todo", updateTodoSchema.shape, async (args, extra) => {
    const { id, ...updates } = args;
    if (!todos.has(id)) {
        return {
            content: [
                {
                    type: "text",
                    text: `❌ Todo with ID ${id} not found`
                }
            ],
            isError: true
        };
    }
    const item = todos.get(id)!;
    // 更新字段
    if (updates.title !== undefined) item.title = updates.title;
    if (updates.description !== undefined) item.description = updates.description;
    if (updates.dueDate !== undefined) item.dueDate = new Date(updates.dueDate);
    // 处理提醒时间更新（允许清除提醒）
    if (updates.reminder !== undefined) {
        item.reminder = updates.reminder === null 
            ? undefined 
            : new Date(updates.reminder);
    }
    if (updates.completed !== undefined) item.completed = updates.completed;
    todos.set(id, item);
    saveTodos(); // 保存到文件
    return {
        content: [
            {
                type: "text",
                text: `✅ 已更新待办事项: ${id}`
            }
        ]
    };
});

// 删除待办事项
server.tool("delete-todo", deleteTodoSchema.shape, async (args, extra) => {
    const { id } = args;
    if (!todos.has(id)) {
        return {
            content: [
                {
                    type: "text",
                    text: `❌ 待办事项 ID ${id} 不存在`
                }
            ],
            isError: true
        };
    }
    todos.delete(id);
    saveTodos(); // 保存到文件
    return {
        content: [
            {
                type: "text",
                text: `✅ 已删除待办事项: ${id}`
            }
        ]
    };
});

// 查询即将过期的待办事项
server.tool("get-upcoming-todos", getUpcomingSchema.shape, async (args, extra) => {
    const { days } = args;
    const now = new Date();
    const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const upcoming: TodoItem[] = [];
    
    for (const [id, item] of todos.entries()) {
        if (!item.completed && item.dueDate <= threshold) {
            upcoming.push(item);
        }
    }
    
    if (upcoming.length === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "🔍 未找到即将到期的待办事项"
                }
            ]
        };
    }
    
    // 按截止时间排序并格式化输出
    const formatted = upcoming
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .map(item => `📌 ID: ${item.id}
标题: ${item.title}
截止时间: ${item.dueDate.toLocaleString('zh-CN')}
描述: ${item.description}
${item.reminder ? `提醒时间: ${item.reminder.toLocaleString('zh-CN')}` : ''}`)
        .join("\n---\n");
    
    return {
        content: [
            {
                type: "text",
                text: `📅 未来 ${days} 天内有 ${upcoming.length} 个待办事项：\n\n${formatted}`
            }
        ]
    };
});

// 列出所有待办事项
server.tool("list-all-todos", listAllTodosSchema.shape, async (args, extra) => {
    if (todos.size === 0) {
        return {
            content: [
                {
                    type: "text",
                    text: "📭 暂无待办事项"
                }
            ]
        };
    }
    
    const allTodos = Array.from(todos.values());
    const pending = allTodos.filter(item => !item.completed);
    const completed = allTodos.filter(item => item.completed);
    
    let result = `📋 待办事项列表（共 ${todos.size} 项）\n\n`;
    
    if (pending.length > 0) {
        result += `⏳ 未完成 (${pending.length}项):\n`;
        result += pending
            .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
            .map(item => `
📌 ${item.title}
   ID: ${item.id}
   描述: ${item.description}
   截止时间: ${item.dueDate.toLocaleString('zh-CN')}
   ${item.reminder ? `提醒时间: ${item.reminder.toLocaleString('zh-CN')}` : ''}`
            )
            .join("\n");
    }
    
    if (completed.length > 0) {
        result += `\n\n✅ 已完成 (${completed.length}项):\n`;
        result += completed
            .sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())
            .map(item => `
✓ ${item.title}
   ID: ${item.id}
   截止时间: ${item.dueDate.toLocaleString('zh-CN')}`
            )
            .join("\n");
    }
    
    return {
        content: [
            {
                type: "text",
                text: result
            }
        ]
    };
});

// 获取统计信息
server.tool("get-stats", getStatsSchema.shape, async (args, extra) => {
    const total = todos.size;
    const completed = Array.from(todos.values()).filter(item => item.completed).length;
    const pending = total - completed;
    const now = new Date();
    const overdue = Array.from(todos.values()).filter(
        item => !item.completed && item.dueDate < now
    ).length;
    
    const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";
    
    const result = `📊 待办事项统计

📈 总览:
   总计: ${total} 项
   未完成: ${pending} 项
   已完成: ${completed} 项
   已逾期: ${overdue} 项
   
📉 完成率: ${completionRate}%

${total === 0 ? "💡 还没有待办事项，创建一个开始吧！" : ""}`;
    
    return {
        content: [
            {
                type: "text",
                text: result
            }
        ]
    };
});

// 启动服务器
async function startServer() {
    try {
        // 加载现有的待办事项
        loadTodos();
        
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("🚀 Todo MCP 服务器已启动");
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

// 启动服务器
startServer().catch(error => {
    console.error('❌ 启动过程中发生错误:', error);
    process.exit(1);
});
