# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TODO MCP (Model Context Protocol) server that enables LLMs to manage personal to-do items through natural language conversation. The server uses stdio transport for communication.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run the built server
npm start

# Development mode (run TypeScript directly)
npm run dev

# Debug with MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

## Architecture

**Single-file MCP Server** (`src/index.ts`):
- Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`
- In-memory `Map<string, TodoItem>` storage with JSON file persistence (`todos.json`)
- Zod schemas for parameter validation with custom date parsing
- Six MCP tools: `create-todo`, `update-todo`, `delete-todo`, `get-upcoming-todos`, `list-all-todos`, `get-stats`

**Data Flow**:
- `loadTodos()` reads from `todos.json` on startup, deserializing ISO date strings to Date objects
- `saveTodos()` writes to `todos.json` after every mutation (create/update/delete)
- Dates are validated to be in the future when creating/updating todos

**Key Types**:
- `TodoItem`: Runtime interface with Date objects
- `TodoItemSerialized`: Storage interface with ISO date strings
