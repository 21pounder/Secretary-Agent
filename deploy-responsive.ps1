# ========================================
# 🚀 响应式前端一键部署脚本 (PowerShell)
# ========================================

Write-Host "========================================"
Write-Host "🚀 DataAnalyze Helper 响应式升级"
Write-Host "========================================"
Write-Host ""

# 1. 推送到 GitHub
Write-Host "📤 1. 推送代码到 GitHub..." -ForegroundColor Cyan
git add web/src/App.tsx web/src/index.css
git commit -m "✨ feat: 添加完全响应式设计支持

- 移动端侧边栏改为抽屉式
- 添加汉堡菜单和关闭按钮
- 优化所有元素的响应式样式
- 改进触摸交互体验
- 添加移动端特有的 CSS 优化
- 防止 iOS 输入缩放
- 优化按钮触摸目标大小"
git push origin main

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git 推送失败！" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 代码已推送到 GitHub" -ForegroundColor Green
Write-Host ""

# 2. 连接到服务器并更新
Write-Host "🔄 2. 连接服务器并更新..." -ForegroundColor Cyan
Write-Host ""

$sshCommand = @'
cd /opt/app/DataAnalyzeHelper

echo "========== 拉取最新代码 =========="
git pull origin main

echo ""
echo "========== 重启前端服务 =========="
pm2 restart dataanalyze-frontend

echo ""
echo "========== 等待 10 秒 =========="
sleep 10

echo ""
echo "========== 查看前端状态 =========="
pm2 list

echo ""
echo "========== 检查前端日志 =========="
pm2 logs dataanalyze-frontend --lines 30 --nostream

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 移动端访问: http://8.140.243.7:3000"
echo "💻 PC端访问: http://8.140.243.7:3000"
echo ""
echo "🎯 测试要点："
echo "  1. 在手机浏览器打开网址"
echo "  2. 点击左上角汉堡菜单 ☰"
echo "  3. 侧边栏应该滑出"
echo "  4. 点击侧边栏上的 X 或遮罩层关闭"
echo "  5. 输入框和按钮应该适配屏幕大小"
echo ""
'@

ssh root@8.140.243.7 $sshCommand

Write-Host ""
Write-Host "========================================"
Write-Host "✅ 响应式升级部署完成！" -ForegroundColor Green
Write-Host "========================================"
Write-Host ""
Write-Host "📱 现在可以在手机上访问了：" -ForegroundColor Yellow
Write-Host "   http://8.140.243.7:3000"
Write-Host ""
Write-Host "🎨 主要改进：" -ForegroundColor Cyan
Write-Host "   ✅ 移动端抽屉式侧边栏"
Write-Host "   ✅ 汉堡菜单按钮"
Write-Host "   ✅ 响应式字体和间距"
Write-Host "   ✅ 优化的触摸交互"
Write-Host "   ✅ 防止 iOS 输入缩放"
Write-Host "   ✅ 适配平板和桌面"
Write-Host ""
Write-Host "💡 提示：" -ForegroundColor Yellow
Write-Host "   - 手机横屏/竖屏都会自动适配"
Write-Host "   - iPad 也能完美显示"
Write-Host "   - PC 端保持原有体验"
Write-Host ""

