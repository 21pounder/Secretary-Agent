#!/bin/bash

# 🚀 DataAnalyzeHelper 完整启动脚本
# 同时启动后端（Mastra）和前端（Web）服务
# 使用 PM2 管理后台运行，关闭终端后继续运行

set -e

echo "=========================================="
echo "🚀 启动 DataAnalyzeHelper (后端 + 前端)"
echo "=========================================="
echo ""

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 未安装，正在安装..."
    npm install -g pm2
fi

# 检查 Node.js 版本
NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"
echo ""

# 获取当前目录
CURRENT_DIR=$(pwd)
echo "📂 当前目录: $CURRENT_DIR"
echo ""

# 停止旧进程（如果存在）
echo "🔄 检查是否有运行中的进程..."
if pm2 list | grep -q "dataanalyze-backend"; then
    echo "⚠️  停止旧的后端进程..."
    pm2 stop dataanalyze-backend
    pm2 delete dataanalyze-backend
fi

if pm2 list | grep -q "dataanalyze-frontend"; then
    echo "⚠️  停止旧的前端进程..."
    pm2 stop dataanalyze-frontend
    pm2 delete dataanalyze-frontend
fi
echo ""

# 启动后端服务（Mastra）
echo "🚀 启动后端服务 (Mastra)..."
pm2 start npm --name "dataanalyze-backend" --cwd "$CURRENT_DIR" -- run dev
echo ""

# 启动前端服务（Web）
echo "🚀 启动前端服务 (Web)..."
pm2 start npm --name "dataanalyze-frontend" --cwd "$CURRENT_DIR/web" -- run dev
echo ""

# 保存 PM2 配置
echo "💾 保存 PM2 配置..."
pm2 save
echo ""

# 设置开机自启（首次运行时）
echo "🔧 配置开机自启..."
pm2 startup | grep -v "PM2" | bash || true
echo ""

echo "=========================================="
echo "✅ 启动完成！"
echo "=========================================="
echo ""
echo "📊 服务状态："
pm2 list
echo ""
echo "📝 查看日志："
echo "   后端: pm2 logs dataanalyze-backend"
echo "   前端: pm2 logs dataanalyze-frontend"
echo "   全部: pm2 logs"
echo ""
echo "🔍 实时监控："
echo "   pm2 monit"
echo ""
echo "🌐 访问地址："
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "   后端 API:  http://localhost:4111/"
echo "   前端 Web:  http://localhost:3000/"
if [ -n "$SERVER_IP" ]; then
    echo ""
    echo "   外部访问（如果开放端口）："
    echo "   后端 API:  http://$SERVER_IP:4111/"
    echo "   前端 Web:  http://$SERVER_IP:3000/"
fi
echo ""
echo "🛑 停止服务："
echo "   全部停止: pm2 stop all"
echo "   仅后端:   pm2 stop dataanalyze-backend"
echo "   仅前端:   pm2 stop dataanalyze-frontend"
echo ""
echo "🔄 重启服务："
echo "   全部重启: pm2 restart all"
echo "   仅后端:   pm2 restart dataanalyze-backend"
echo "   仅前端:   pm2 restart dataanalyze-frontend"
echo ""
echo "🗑️  删除服务:"
echo "   pm2 delete all"
echo ""
echo "💡 提示："
echo "   - 关闭终端后服务会继续运行"
echo "   - 服务器重启后自动启动（已配置）"
echo "   - 如需阿里云外部访问，请在安全组开放端口 3000 和 4111"
echo ""

