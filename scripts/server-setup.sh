#!/bin/bash

# 🚀 阿里云服务器快速设置脚本
# 用于在服务器上索引员工手册和知识库到 Milvus

echo "=========================================="
echo "📦 阿里云服务器 RAG 数据索引工具"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js >= 20.9.0"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install
echo ""

# 检查数据文件
echo "📄 检查数据文件..."
if [ ! -f "data/employee-rules.txt" ]; then
    echo "⚠️  警告: data/employee-rules.txt 不存在"
else
    echo "✅ 找到 employee-rules.txt"
fi

if [ ! -f "data/dmbj.txt" ]; then
    echo "⚠️  警告: data/dmbj.txt 不存在"
else
    echo "✅ 找到 dmbj.txt"
fi
echo ""

# 创建 .env 文件（如果不存在）
if [ ! -f ".env" ]; then
    echo "📝 创建 .env 文件..."
    cat > .env << 'EOF'
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Milvus Vector Database (使用 localhost，因为在同一台机器)
MILVUS_HOST=localhost
MILVUS_PORT=19530
EMPLOYEE_RULES_COLLECTION=employee_rules
MILVUS_COLLECTION=knowledge_book

# Redis Cache
REDIS_HOST=localhost
REDIS_PORT=6379

# MySQL Database (如果需要)
MYSQL_DSN=mysql://root:123456@localhost:3306/itmiles?sslmode=disable
EOF
    echo "⚠️  请编辑 .env 文件，填入正确的 OPENAI_API_KEY"
    echo "   vim .env"
    echo ""
    exit 0
fi

echo "✅ .env 文件已存在"
echo ""

# 检查环境变量
if grep -q "your_openai_api_key_here" .env; then
    echo "❌ 请先在 .env 中设置 OPENAI_API_KEY"
    echo "   vim .env"
    exit 1
fi

# 检查 Docker 服务
echo "🐳 检查 Docker 服务..."
if ! docker ps | grep -q milvus; then
    echo "❌ Milvus 未运行，请先启动 Milvus"
    echo "   docker ps"
    exit 1
fi

if ! docker ps | grep -q redis; then
    echo "⚠️  Redis 未运行，建议启动 Redis 以启用缓存功能"
fi
echo ""

# 索引员工手册
echo "=========================================="
echo "📚 开始索引员工手册..."
echo "=========================================="
npm run index-pdf
EMPLOYEE_EXIT_CODE=$?
echo ""

# 索引知识库
echo "=========================================="
echo "📖 开始索引知识库..."
echo "=========================================="
npm run index-dmbj
KNOWLEDGE_EXIT_CODE=$?
echo ""

# 总结
echo "=========================================="
echo "🎉 索引完成！"
echo "=========================================="
echo ""

if [ $EMPLOYEE_EXIT_CODE -eq 0 ]; then
    echo "✅ 员工手册索引成功"
else
    echo "❌ 员工手册索引失败 (退出码: $EMPLOYEE_EXIT_CODE)"
fi

if [ $KNOWLEDGE_EXIT_CODE -eq 0 ]; then
    echo "✅ 知识库索引成功"
else
    echo "❌ 知识库索引失败 (退出码: $KNOWLEDGE_EXIT_CODE)"
fi

echo ""
echo "📊 验证索引结果:"
echo "   - 检查 Milvus collections:"
echo "     docker exec -it milvus-standalone milvus-cli"
echo "     > list collections"
echo ""
echo "   - 运行应用:"
echo "     npm run dev"
echo ""

