#!/bin/bash
# Ubuntu 云服务器诊断脚本
# 用于检测 DataAnalyzeHelper 部署时的 MCP 依赖问题

echo "============================================"
echo "DataAnalyzeHelper Ubuntu 部署诊断"
echo "============================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查结果统计
ERRORS=0
WARNINGS=0

# 函数：打印错误
error() {
    echo -e "${RED}❌ 错误: $1${NC}"
    ERRORS=$((ERRORS + 1))
}

# 函数：打印警告
warning() {
    echo -e "${YELLOW}⚠️  警告: $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

# 函数：打印成功
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "【第 1 步】检查系统环境"
echo "----------------------------------------"

# 检查操作系统
if [ -f /etc/os-release ]; then
    source /etc/os-release
    echo "操作系统: $NAME $VERSION"
else
    warning "无法检测操作系统版本"
fi

# 检查 Node.js 版本
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    success "Node.js 已安装: $NODE_VERSION"

    # 检查版本是否 >= 20.9.0
    REQUIRED_VERSION="v20.9.0"
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_VERSION" ]; then
        success "Node.js 版本满足要求 (>= 20.9.0)"
    else
        error "Node.js 版本过低，需要 >= 20.9.0，当前: $NODE_VERSION"
    fi
else
    error "Node.js 未安装"
fi

# 检查 Python 3
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    success "Python3 已安装: $PYTHON_VERSION"
else
    warning "Python3 未安装（某些 MCP 服务器需要）"
fi

# 检查 uv（Python 包管理器）
if command -v uvx &> /dev/null; then
    UV_VERSION=$(uv --version 2>/dev/null || echo "未知版本")
    success "uv 已安装: $UV_VERSION"
else
    error "uv 未安装（mcp-server-hotnews 和 juhe-mcp-server 需要）"
    echo "   安装命令: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

echo ""
echo "【第 2 步】检查 npm 配置"
echo "----------------------------------------"

# 检查 npm 镜像源
NPM_REGISTRY=$(npm config get registry)
echo "npm 镜像源: $NPM_REGISTRY"

if [[ "$NPM_REGISTRY" == *"npmjs.org"* ]]; then
    warning "使用官方 npm 源（国外），可能导致超时"
    echo "   推荐配置: npm config set registry https://registry.npmmirror.com"
elif [[ "$NPM_REGISTRY" == *"npmmirror.com"* ]] || [[ "$NPM_REGISTRY" == *"taobao.org"* ]]; then
    success "使用国内镜像源"
else
    echo "   使用自定义镜像源"
fi

echo ""
echo "【第 3 步】检查 MCP 依赖包"
echo "----------------------------------------"

# 检查全局安装的 MCP 包
declare -a MCP_PACKAGES=("12306-mcp" "@bytebase/dbhub" "balldontlie-mcp" "iching-mcp")

for pkg in "${MCP_PACKAGES[@]}"; do
    if npm list -g "$pkg" &> /dev/null; then
        success "$pkg 已全局安装"
    else
        warning "$pkg 未全局安装（首次启动时会自动下载，可能超时）"
        echo "   安装命令: npm install -g $pkg"
    fi
done

echo ""
echo "【第 4 步】检查环境变量"
echo "----------------------------------------"

# 检查项目目录
if [ ! -f ".env" ]; then
    error ".env 文件不存在"
else
    success ".env 文件存在"

    # 检查关键环境变量（不显示实际值，只检查是否存在）
    declare -a ENV_VARS=("OPENAI_API_KEY" "OPENAI_BASE_URL" "MYSQL_DSN" "MEM0_API_KEY")

    for var in "${ENV_VARS[@]}"; do
        if grep -q "^${var}=" .env; then
            VALUE=$(grep "^${var}=" .env | cut -d'=' -f2 | cut -c1-10)
            if [ -n "$VALUE" ] && [ "$VALUE" != '""' ]; then
                success "$var 已配置"
            else
                warning "$var 存在但为空"
            fi
        else
            if [ "$var" = "OPENAI_API_KEY" ] || [ "$var" = "MYSQL_DSN" ]; then
                error "$var 未配置（必需）"
            else
                warning "$var 未配置（可选）"
            fi
        fi
    done
fi

echo ""
echo "【第 5 步】检查网络连接"
echo "----------------------------------------"

# 检查 PyPI 清华镜像
if curl -s --connect-timeout 5 https://pypi.tuna.tsinghua.edu.cn/simple &> /dev/null; then
    success "PyPI 清华镜像可访问"
else
    warning "PyPI 清华镜像连接失败"
fi

# 检查 npm 镜像
if curl -s --connect-timeout 5 "$NPM_REGISTRY" &> /dev/null; then
    success "npm 镜像源可访问"
else
    warning "npm 镜像源连接失败"
fi

# 检查 OpenAI API（如果配置了 BASE_URL）
if [ -f ".env" ] && grep -q "^OPENAI_BASE_URL=" .env; then
    OPENAI_BASE_URL=$(grep "^OPENAI_BASE_URL=" .env | cut -d'=' -f2 | tr -d '"')
    if [ -n "$OPENAI_BASE_URL" ]; then
        if curl -s --connect-timeout 5 "$OPENAI_BASE_URL" &> /dev/null; then
            success "OpenAI API 可访问"
        else
            warning "OpenAI API 连接失败: $OPENAI_BASE_URL"
        fi
    fi
fi

echo ""
echo "【第 6 步】检查项目依赖"
echo "----------------------------------------"

# 检查 node_modules
if [ -d "node_modules" ]; then
    success "node_modules 目录存在"

    # 检查关键依赖
    declare -a KEY_DEPS=("@mastra/core" "@mastra/mcp" "chromadb" "mem0ai")

    for dep in "${KEY_DEPS[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            success "$dep 已安装"
        else
            error "$dep 未安装"
        fi
    done
else
    error "node_modules 目录不存在，请运行: npm install"
fi

echo ""
echo "【第 7 步】检查端口占用"
echo "----------------------------------------"

# 检查 4111 端口是否被占用
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ":4111 "; then
        warning "端口 4111 已被占用"
        netstat -tuln | grep ":4111 "
    else
        success "端口 4111 未被占用"
    fi
elif command -v ss &> /dev/null; then
    if ss -tuln | grep -q ":4111 "; then
        warning "端口 4111 已被占用"
        ss -tuln | grep ":4111 "
    else
        success "端口 4111 未被占用"
    fi
else
    warning "无法检查端口占用（netstat/ss 未安装）"
fi

echo ""
echo "【第 8 步】检查数据库连接"
echo "----------------------------------------"

# 检查 ChromaDB（端口 8000）
if curl -s --connect-timeout 5 http://localhost:8000/api/v1/heartbeat &> /dev/null; then
    success "ChromaDB 运行正常 (端口 8000)"
else
    warning "ChromaDB 未运行或不可访问 (端口 8000)"
    echo "   启动命令: docker run -d -p 8000:8000 chromadb/chroma:latest"
fi

# 检查 Milvus（端口 19530）
if nc -z -w5 localhost 19530 &> /dev/null; then
    success "Milvus 运行正常 (端口 19530)"
else
    warning "Milvus 未运行或不可访问 (端口 19530)"
    echo "   启动命令: docker-compose up -d"
fi

# 检查 Redis（端口 6379）
if command -v redis-cli &> /dev/null; then
    if redis-cli ping &> /dev/null; then
        success "Redis 运行正常 (端口 6379)"
    else
        warning "Redis 未运行"
    fi
else
    if nc -z -w5 localhost 6379 &> /dev/null; then
        success "Redis 端口可访问 (端口 6379)"
    else
        warning "Redis 未运行或不可访问 (端口 6379)"
    fi
fi

echo ""
echo "============================================"
echo "诊断结果汇总"
echo "============================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    success "所有检查通过！环境配置正常"
    echo ""
    echo "可以尝试启动项目:"
    echo "  npm run dev"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $WARNINGS 个警告，但不影响基本功能${NC}"
    echo ""
    echo "可以尝试启动项目:"
    echo "  npm run dev"
else
    error "发现 $ERRORS 个错误和 $WARNINGS 个警告"
    echo ""
    echo "请先解决上述错误，再启动项目"
    echo "详细解决方案请参考: DEPLOYMENT.md"
fi

echo ""
echo "============================================"
echo "常用命令"
echo "============================================"
echo "1. 安装 uv:"
echo "   curl -LsSf https://astral.sh/uv/install.sh | sh"
echo ""
echo "2. 配置 npm 镜像:"
echo "   npm config set registry https://registry.npmmirror.com"
echo ""
echo "3. 预安装 MCP 包:"
echo "   npm install -g 12306-mcp @bytebase/dbhub balldontlie-mcp iching-mcp"
echo ""
echo "4. 启动项目（带调试日志）:"
echo "   DEBUG=* npm run dev"
echo ""
echo "5. 查看启动日志:"
echo "   npm run dev 2>&1 | tee startup.log"
echo ""
