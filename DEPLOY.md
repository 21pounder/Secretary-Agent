# 🚀 阿里云服务器部署指南

本指南将帮助你在阿里云服务器上部署 DataAnalyzeHelper，实现后端和前端同时运行，并在关闭SSH终端后继续运行。

## 📋 前置要求

- 阿里云服务器（Ubuntu 20.04+ 或 CentOS 7+）
- Node.js >= 20.9.0
- Docker（用于 Milvus、Redis、MySQL）
- 至少 2GB RAM

## 🔧 一键部署步骤

### 1. 上传代码到服务器

**方式A：Git（推荐）**

```bash
cd /opt/app
git clone 你的仓库地址
cd DataAnalyzeHelper
```

**方式B：SCP上传**

在本地 Windows PowerShell：

```powershell
# 打包（排除 node_modules）
cd E:\uselessproject\dataanalyzeagent\DataAnalyzeHelper
tar -czf dataanalyze.tar.gz --exclude=node_modules --exclude=.mastra --exclude=web/node_modules .

# 上传
scp dataanalyze.tar.gz root@8.140.243.7:/opt/app/
```

在服务器上解压：

```bash
cd /opt/app
rm -rf DataAnalyzeHelper  # 删除旧版本
mkdir DataAnalyzeHelper
cd DataAnalyzeHelper
tar -xzf ../dataanalyze.tar.gz
```

### 2. 安装依赖

```bash
cd /opt/app/DataAnalyzeHelper

# 安装后端依赖
npm install

# 安装前端依赖
cd web
npm install
cd ..
```

### 3. 配置环境变量

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# OpenAI API
OPENAI_API_KEY=sk-你的OpenAI-Key
OPENAI_BASE_URL=https://api.openai.com/v1

# Milvus (使用 localhost，服务在同一台机器)
MILVUS_HOST=localhost
MILVUS_PORT=19530
EMPLOYEE_RULES_COLLECTION=employee_rules
MILVUS_COLLECTION=knowledge_book

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MySQL
MYSQL_DSN=mysql://root:123456@localhost:3306/itmiles?sslmode=disable
EOF

# 编辑 .env 填入正确的 API Key
vim .env  # 或 nano .env
```

### 4. 确保 Docker 服务运行

```bash
# 检查 Docker 服务
docker ps

# 应该看到：
# - milvus-standalone
# - redis
# - mysql
```

如果没有运行，参考 `docker-compose.yml` 启动：

```bash
docker compose up -d
```

### 5. 索引数据到 Milvus

```bash
cd /opt/app/DataAnalyzeHelper

# 方式1: 使用自动化脚本（推荐）
chmod +x scripts/server-setup.sh
./scripts/server-setup.sh
```

或手动索引：

```bash
# 索引员工手册
npm run index-pdf

# 索引知识库
npm run index-dmbj
```

### 6. 启动服务（一键启动）

```bash
# 赋予执行权限
chmod +x start.sh stop.sh

# 启动所有服务（后端 + 前端）
./start.sh
```

**输出示例：**

```
==========================================
🚀 启动 DataAnalyzeHelper (后端 + 前端)
==========================================

✅ Node.js 版本: v20.x.x
📂 当前目录: /opt/app/DataAnalyzeHelper

🚀 启动后端服务 (Mastra)...
🚀 启动前端服务 (Web)...
💾 保存 PM2 配置...

✅ 启动完成！

📊 服务状态：
┌────┬──────────────────────────┬──────┬──────┐
│ id │ name                     │ mode │ ↺    │
├────┼──────────────────────────┼──────┼──────┤
│ 0  │ dataanalyze-backend      │ fork │ 0    │
│ 1  │ dataanalyze-frontend     │ fork │ 0    │
└────┴──────────────────────────┴──────┴──────┘

🌐 访问地址：
   后端 API:  http://localhost:4111/
   前端 Web:  http://localhost:3000/
   
   外部访问（如果开放端口）：
   后端 API:  http://8.140.243.7:4111/
   前端 Web:  http://8.140.243.7:3000/
```

### 7. 配置阿里云安全组（外部访问）

如果需要外网访问，在阿里云控制台配置安全组规则：

1. 登录阿里云控制台
2. 进入 ECS 实例
3. 找到「安全组」→「配置规则」
4. 添加入方向规则：
   - 端口：3000（前端）
   - 端口：4111（后端）
   - 授权对象：0.0.0.0/0（或指定IP）

## 🎯 PM2 常用命令

### 查看服务状态

```bash
pm2 list          # 列出所有服务
pm2 status        # 查看状态
pm2 monit         # 实时监控（交互式）
```

### 查看日志

```bash
pm2 logs                        # 查看所有日志（实时）
pm2 logs dataanalyze-backend    # 仅查看后端日志
pm2 logs dataanalyze-frontend   # 仅查看前端日志
pm2 logs --lines 100            # 查看最近100行
```

### 重启服务

```bash
pm2 restart all                    # 重启所有
pm2 restart dataanalyze-backend    # 仅重启后端
pm2 restart dataanalyze-frontend   # 仅重启前端
```

### 停止服务

```bash
./stop.sh                          # 使用停止脚本
# 或
pm2 stop all                       # 停止所有
pm2 stop dataanalyze-backend       # 仅停止后端
pm2 stop dataanalyze-frontend      # 仅停止前端
```

### 删除服务

```bash
pm2 delete all                     # 删除所有
pm2 delete dataanalyze-backend     # 仅删除后端
pm2 delete dataanalyze-frontend    # 仅删除前端
```

### 保存和恢复

```bash
pm2 save                           # 保存当前进程列表
pm2 resurrect                      # 恢复之前保存的进程
pm2 startup                        # 生成开机自启脚本
```

## 🔍 故障排查

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :4111  # 后端端口
lsof -i :3000  # 前端端口

# 杀死占用进程
kill -9 <PID>
```

### 2. 服务无法启动

```bash
# 查看详细日志
pm2 logs dataanalyze-backend --lines 100
pm2 logs dataanalyze-frontend --lines 100

# 检查环境变量
cat .env

# 检查 Node.js 版本
node -v  # 应该 >= 20.9.0
```

### 3. Milvus 连接失败

```bash
# 检查 Milvus 状态
docker ps | grep milvus
docker logs milvus-standalone

# 重启 Milvus
docker restart milvus-standalone
```

### 4. 前端无法连接后端

检查 `web/src/api/client.ts` 中的 API 地址配置。

### 5. 清理并重新部署

```bash
# 停止所有服务
pm2 delete all

# 清理缓存
rm -rf .mastra
rm -rf node_modules/.cache
rm -rf web/node_modules/.cache

# 重新安装
npm install
cd web && npm install && cd ..

# 重新启动
./start.sh
```

## 📊 性能监控

### 使用 PM2 监控

```bash
# 实时监控（CPU、内存）
pm2 monit

# 查看详细信息
pm2 show dataanalyze-backend
pm2 show dataanalyze-frontend
```

### 资源使用

```bash
# 查看服务器资源
htop          # 或 top
df -h         # 磁盘使用
free -h       # 内存使用
```

## 🔄 更新部署

### 更新代码

```bash
cd /opt/app/DataAnalyzeHelper

# 拉取最新代码
git pull

# 或重新上传并解压

# 重新安装依赖（如果 package.json 有变化）
npm install
cd web && npm install && cd ..

# 重启服务
pm2 restart all
```

### 重新索引数据

如果数据文件有更新：

```bash
npm run index-pdf    # 重新索引员工手册
npm run index-dmbj   # 重新索引知识库
```

## 🔐 安全建议

1. **不要暴露敏感端口**：
   - 只在安全组开放必要的端口
   - 考虑使用 Nginx 反向代理

2. **定期更新**：
   ```bash
   npm update
   cd web && npm update
   ```

3. **备份数据**：
   ```bash
   # 备份 Milvus 数据
   docker exec milvus-standalone tar -czf /backup/milvus.tar.gz /var/lib/milvus
   
   # 备份 MySQL
   docker exec mysql mysqldump -u root -p123456 itmiles > backup.sql
   ```

4. **监控日志**：
   ```bash
   # 定期检查日志
   pm2 logs --lines 1000 | grep ERROR
   ```

## 📞 快速参考

### 一键命令

```bash
# 启动所有服务
./start.sh

# 停止所有服务
./stop.sh

# 查看服务状态
pm2 list

# 查看日志
pm2 logs

# 重启所有服务
pm2 restart all
```

### 文件结构

```
/opt/app/DataAnalyzeHelper/
├── start.sh           # 启动脚本 ⭐
├── stop.sh            # 停止脚本
├── .env               # 环境配置 (需手动创建)
├── src/               # 后端代码
├── web/               # 前端代码
├── data/              # 数据文件
│   ├── employee-rules.txt
│   └── dmbj.txt
└── scripts/           # 工具脚本
    ├── server-setup.sh    # 自动化部署
    ├── index-pdf.ts       # 员工手册索引
    └── index-dmbj.ts      # 知识库索引
```

---

**祝部署顺利！** 🎉

如有问题，请查看日志：`pm2 logs`

