#!/bin/bash

# 🛑 DataAnalyzeHelper 停止脚本

echo "=========================================="
echo "🛑 停止 DataAnalyzeHelper"
echo "=========================================="
echo ""

# 检查 PM2 是否安装
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 未安装，无法停止服务"
    exit 1
fi

# 显示当前运行的服务
echo "📊 当前运行的服务："
pm2 list
echo ""

# 停止所有相关服务
echo "🛑 停止后端服务..."
pm2 stop dataanalyze-backend 2>/dev/null || echo "   后端未在运行"

echo "🛑 停止前端服务..."
pm2 stop dataanalyze-frontend 2>/dev/null || echo "   前端未在运行"

echo ""
echo "✅ 服务已停止（但未删除，可以使用 pm2 restart 恢复）"
echo ""
echo "📊 最新状态："
pm2 list
echo ""
echo "💡 如需完全删除服务，请运行："
echo "   pm2 delete dataanalyze-backend dataanalyze-frontend"
echo "   或: pm2 delete all"
echo ""

