import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { MDocument } from '@mastra/rag';
import { ChromaVector, CHROMA_PROMPT } from '@mastra/chroma';
import { createVectorQueryTool } from '@mastra/rag';
import { createTool } from '@mastra/core/tools';
import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

// Chroma 配置（从环境变量读取）
const CHROMA_HOST = process.env.CHROMA_HOST || 'localhost';
const CHROMA_PORT = parseInt(process.env.CHROMA_PORT || '8000', 10);
const CHROMA_URL = `http://${CHROMA_HOST}:${CHROMA_PORT}`;
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'employee_rules';

// OpenAI 配置（从环境变量读取）
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
};

// OpenAI 实例
let _openaiInstance: ReturnType<typeof createOpenAI> | null = null;
function getOpenAI() {
  if (!_openaiInstance) {
    console.log('🔧 初始化 OpenAI，Base URL:', OPENAI_CONFIG.baseURL);
    
    // 检查 API Key 是否包含非 ASCII 字符
    const hasNonASCII = /[^\x00-\x7F]/.test(OPENAI_CONFIG.apiKey);
    if (hasNonASCII) {
      console.error('❌ API Key 包含非 ASCII 字符（可能是中文）！');
      console.error('   请检查 API Key 第17-19行，确保只有英文数字和连字符');
      throw new Error('API Key contains non-ASCII characters');
    }
    
    _openaiInstance = createOpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      baseURL: OPENAI_CONFIG.baseURL,
    });
  }
  return _openaiInstance;
}

// 初始化 Chroma 向量存储（导出以便注册到 Mastra）
// 注意：Chroma 推荐使用 host/port 而不是 path
export const chromaStore = new ChromaVector({
  host: CHROMA_HOST,
  port: CHROMA_PORT,
});

/**
 * 读取文档文件（支持 PDF 和 TXT）
 */
async function readDocument(filePath: string): Promise<string> {
  try {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.txt') {
      // 读取 TXT 文件，尝试多种编码
      console.log('📄 Reading TXT file...');
      
      // 先尝试 UTF-8
      try {
        const text = fs.readFileSync(filePath, 'utf-8');
        // 检查是否有乱码（检测常见的乱码模式）
        if (text.includes('�') || !/[\u4e00-\u9fa5]/.test(text.substring(0, 100))) {
          console.log('⚠️  UTF-8 编码可能有问题，尝试 GBK...');
          throw new Error('Try GBK');
        }
        return text;
      } catch (e) {
        // 尝试 GBK 编码（Windows 中文系统常用）
        console.log('📦 Trying GBK encoding...');
        const iconv = await import('iconv-lite');
        const buffer = fs.readFileSync(filePath);
        const text = iconv.default.decode(buffer, 'gbk');
        return text;
      }
    } else if (ext === '.pdf') {
      // 读取 PDF 文件
      console.log('📄 Reading PDF file...');
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdfParse = require('pdf-parse');
      
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else {
      throw new Error(`Unsupported file format: ${ext}. Only .txt and .pdf are supported.`);
    }
  } catch (error) {
    console.error('Error reading document:', error);
    throw error;
  }
}

/**
 * 索引文档到 Chroma（首次运行时调用）
 */
export async function indexEmployeeRules() {
  try {
    console.log('📄 开始索引员工规则文档...');
    
    // 查找文档文件（优先 TXT，其次 PDF）
    const basePath = path.join(process.cwd(), 'data/employee-rules');
    let docPath = '';
    
    if (fs.existsSync(`${basePath}.txt`)) {
      docPath = `${basePath}.txt`;
      console.log('📂 找到 TXT 文件');
    } else if (fs.existsSync(`${basePath}.pdf`)) {
      docPath = `${basePath}.pdf`;
      console.log('📂 找到 PDF 文件');
    } else {
      console.log(`⚠️  文档文件不存在: ${basePath}.txt 或 ${basePath}.pdf`);
      return;
    }
    
    console.log(`📂 文档路径: ${docPath}`);
    
    // 读取文档
    console.log('📖 读取文档文本...');
    const documentText = await readDocument(docPath);
    console.log(`📚 提取了 ${documentText.length} 个字符`);
    
    // 创建文档并分块
    const doc = MDocument.fromText(documentText);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 512,
      overlap: 50,
    });
    
    const chunkDocs = doc.getDocs();
    const chunkTexts = chunkDocs.map(chunk => chunk.text);
    console.log(`✂️  分割成 ${chunkTexts.length} 个块`);
    
    // 生成嵌入
    console.log('🧮 生成嵌入向量...');
    const { embeddings } = await embedMany({
      model: getOpenAI().embedding('text-embedding-3-small'),
      values: chunkTexts,
    });
    
    console.log(`✅ 生成了 ${embeddings.length} 个嵌入向量`);
    
    // 创建/重建索引 - 使用 Chroma 原生 API
    try {
      // 直接操作 Chroma 客户端删除 collection
      const { ChromaClient } = await import('chromadb');
      const chromaClient = new ChromaClient({
        path: CHROMA_URL,  // 使用配置的 URL
      });
      
      // 尝试删除旧 collection
      try {
        await chromaClient.deleteCollection({ name: COLLECTION_NAME });
        console.log(`🗑️  删除旧 collection: ${COLLECTION_NAME}`);
        // 等待一下确保删除完成
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e: any) {
        console.log(`ℹ️  ${e.message || '旧 collection 不存在，跳过删除'}`);
      }
      
      // 创建新索引
      await chromaStore.createIndex({
        indexName: COLLECTION_NAME,
        dimension: 1536,
      });
      console.log(`📦 创建新索引: ${COLLECTION_NAME} (维度: 1536)`);
    } catch (error) {
      console.error('❌ 创建索引失败:', error);
      throw error;
    }
    
    // 存储到 Chroma
    console.log('💾 存储嵌入向量到 Chroma...');
    await chromaStore.upsert({
      indexName: COLLECTION_NAME,
      vectors: embeddings,
      metadata: chunkTexts.map((text, index) => ({
        text,
        source: 'employee-rules.pdf',
        chunk_index: index,
        total_chunks: chunkTexts.length,
      })),
    });
    
    console.log('✅ 员工规则索引完成！');
  } catch (error) {
    console.error('❌ 索引失败:', error);
    throw error;
  }
}

function extractKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // 1. 提取所有数字（如 "30天" 中的 "30"）
  const numbers = query.match(/\d+/g);
  if (numbers) {
    keywords.push(...numbers);
  }
  
  // 2. 提取重要词汇（员工手册相关的关键词）
  const importantWords = [
    // 离职相关
    '辞职', '离职', '解聘', '辞退', '提前', '申请', '书面',
    // 入职相关
    '入职', '录用', '报到', '试用', '转正',
    // 考勤相关
    '考勤', '打卡', '迟到', '早退', '旷工', '请假',
    // 薪酬相关
    '工资', '薪酬', '薪资', '福利', '社保', '公积金',
    // 时间词
    '天', '月', '年', '日', '周',
    // 其他
    '员工', '部门', '主管', '公司', '规定', '制度'
  ];
  
  importantWords.forEach(word => {
    if (query.includes(word)) {
      keywords.push(word);
    }
  });
  
  // 3. 去重并返回
  return [...new Set(keywords)];
}

function reciprocalRankFusion<T extends { id: string }>(
  sources: Array<Array<T>>,
  k: number = 60
): T[] {
  // 1. 创建分数映射表
  const scoreMap = new Map<string, { item: T; score: number }>();
  
  // 2. 遍历每个召回源
  sources.forEach((sourceResults, sourceIndex) => {
    // 遍历该召回源的每个结果
    sourceResults.forEach((item, rank) => {
      const id = item.id;
      
      // 计算 RRF 分数：1 / (k + rank + 1)
      // rank 从 0 开始，所以排名第一的是 rank=0
      const rrfScore = 1 / (k + rank + 1);
      
      // 如果该 item 还没有记录，初始化
      if (!scoreMap.has(id)) {
        scoreMap.set(id, { item, score: 0 });
      }
      
      // 累加分数（多个召回源中出现的次数越多，总分越高）
      const entry = scoreMap.get(id)!;
      entry.score += rrfScore;
    });
  });
  
  // 3. 按融合分数降序排序
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)  // 分数高的在前
    .map(entry => entry.item);          // 提取 item
}

/**
 * 多召回源检索
 * 结合向量检索和关键词检索，提高召回率和准确率
 */
async function multiSourceRetrieval(query: string, topK: number = 5) {
  console.log('🔍 开始多召回源检索...');
  console.log(`   查询: "${query}"`);
  
  // 步骤1：提取关键词
  const keywords = extractKeywords(query);
  console.log(`   提取关键词: [${keywords.join(', ')}]`);
  
  // 步骤2：准备查询列表（原问题 + 关键词组合）
  const queries = [query];  // 原始查询
  if (keywords.length > 0) {
    // 添加关键词组合查询（用于增强检索）
    queries.push(keywords.join(' '));
  }
  
  // 步骤3：生成所有查询的向量
  const { embeddings } = await embedMany({
    model: getOpenAI().embedding('text-embedding-3-small'),
    values: queries
  });
  
  // 步骤4：并行执行多个召回源检索
  console.log(`   执行 ${queries.length} 路并行检索...`);
  const allResults = await Promise.all(
    embeddings.map((queryVector, index) => 
      chromaStore.query({
        indexName: COLLECTION_NAME,
        queryVector: queryVector,
        topK: topK * 2  // 多取一些候选，后面融合会筛选
      }).then(results => {
        console.log(`   📊 检索源 ${index + 1} ("${queries[index].substring(0, 30)}..."): 找到 ${results.length} 个结果`);
        return results;
      })
    )
  );
  
  // 步骤5：RRF 融合
  const fusedResults = reciprocalRankFusion(allResults);
  console.log(`   🔀 融合后: ${fusedResults.length} 个结果`);
  
  // 步骤6：返回 Top K
  const finalResults = fusedResults.slice(0, topK);
  console.log(`   ✅ 返回 Top ${topK} 结果`);
  
  return finalResults;
}

// 【旧版】创建向量查询工具（已废弃，仅作参考）
function getVectorQueryTool() {
  return createVectorQueryTool({
    vectorStoreName: 'chroma',
    indexName: COLLECTION_NAME,
    model: getOpenAI().embedding('text-embedding-3-small'),
    description: 'Search the employee rules handbook for information about company policies, benefits, leave policies, conduct guidelines, and other employee-related topics.',
  });
}

// 【新版】创建多召回源查询工具（延迟创建）
function getMultiRecallTool() {
  return createTool({
    id: 'multi_recall_search',
    description: 'Search the employee rules handbook using hybrid retrieval (vector + keyword). This tool combines semantic search and keyword matching for better accuracy. Use it to find information about company policies, benefits, leave policies, conduct guidelines, and other employee-related topics.',
    inputSchema: z.object({
      query: z.string().describe('The search query or question about employee rules'),
      topK: z.number().optional().default(5).describe('Number of results to return (default: 5)')
    }),
    execute: async ({ context }) => {
      const { query, topK = 5 } = context;
      
      console.log(`\n🔧 Tool 执行: multi_recall_search`);
      console.log(`   Query: "${query}"`);
      console.log(`   TopK: ${topK}`);
      
      try {
        // 调用多召回源检索函数
        const results = await multiSourceRetrieval(query, topK);
        
        // 格式化结果，返回给 Agent
        // 优先从 metadata.text 提取内容（ChromaDB 查询结果的实际文本位置）
        const formattedResults = results.map((result: any, index: number) => {
          // 提取文本内容（按优先级尝试）
          const textContent = 
            result.metadata?.text ||     // ChromaDB 存储的文本在这里
            result.content ||             // 其他向量库可能用这个字段
            result.text ||                // 备用字段
            '';                           // 兜底空字符串
          
          return {
            rank: index + 1,
            text: textContent,
            metadata: {
              source: result.metadata?.source || '',
              chunk_index: result.metadata?.chunk_index,
              total_chunks: result.metadata?.total_chunks,
            },
            score: result.score || result.distance || 0
          };
        });
        
        console.log(`   ✅ Tool 返回: ${formattedResults.length} 个结果`);
        console.log(`   📝 第一个结果预览: "${formattedResults[0]?.text?.substring(0, 50)}..."\n`);
        
        return {
          results: formattedResults,
          message: `Found ${formattedResults.length} relevant sections from the employee handbook.`
        };
      } catch (error) {
        console.error('   ❌ Tool 执行失败:', error);
        return {
          results: [],
          message: `Search failed: ${error instanceof Error ? error.message : String(error)}`
        };
      }
    }
  });
}

// 创建 RAG Agent
export const employeeRulerAgent = new Agent({
  name: 'Employee Rules Agent',
  description: `
    RAG-powered AI agent specialized in answering questions about employee rules and policies.
    Uses Chroma vector database (${CHROMA_URL}) for semantic search.
    Has access to the company's employee handbook and can provide accurate, context-aware answers.
  `,
  instructions: `
    You are an expert HR assistant with direct access to the company's employee handbook through a RAG system.
    
    ${CHROMA_PROMPT}
    
    ## Core Workflow
    1. **ALWAYS** use the multi_recall_search tool first to search the handbook
    2. Base your answer ONLY on retrieved context - never make assumptions
    3. Quote relevant sections to support your answer
    4. If information isn't found, clearly state that and suggest contacting HR
    
    ## Language Matching (CRITICAL)
    - Respond in the SAME language as the user's question
    - Chinese question → Chinese answer (including all labels, quotes, notes)
    - English question → English answer (including all labels, quotes, notes)
    
    ## Response Format
    
    ### When information IS FOUND (most cases):
    
    **For Chinese queries:**
    📋 **员工手册查询**
    
    **💡 答案：**
    [基于检索内容的准确答案]
    
    **📖 相关政策原文：**
    > "[直接引用手册中的相关段落]"
    
    **📌 注意：** [补充说明或提醒（可选）]
    
    **For English queries:**
    📋 **Employee Handbook Query**
    
    **💡 Answer:**
    [Accurate answer based on retrieved content]
    
    **📖 Policy Reference:**
    > "[Direct quote from handbook]"
    
    **📌 Note:** [Additional information or reminders (optional)]
    
    ### ONLY when information is NOT FOUND:
    
    **For Chinese:**
    ⚠️ 抱歉，员工手册中暂无关于此问题的明确规定。建议您联系人力资源部门（HR）获取准确答复。
    
    **For English:**
    ⚠️ Sorry, this information is not available in the employee handbook. Please contact the HR department for accurate information.
    
    ## Quality Guidelines
    ✓ Accuracy over assumptions
    ✓ Direct quotes when possible
    ✓ Professional and compliant
    ✓ Protect confidential information
    ✓ Clear about limitations
  `,
  model: 'openai/gpt-4o-mini',
  tools: {
    multi_recall_search: getMultiRecallTool(),  // 使用新的混合检索工具
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});

// 可选：在模块加载时自动索引（如果需要）
// 注释掉以避免每次重启都重新索引
/*
indexEmployeeRules().catch(error => {
  console.error('Failed to index employee rules on startup:', error);
});
*/
