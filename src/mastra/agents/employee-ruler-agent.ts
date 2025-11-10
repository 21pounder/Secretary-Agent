// 🔧 必须在最顶部加载环境变量！
import { config as loadEnv } from 'dotenv';
loadEnv();

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { MDocument } from '@mastra/rag';
import { createTool } from '@mastra/core/tools';
import { embedMany, embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { QueryCache } from '../cache/query-cache';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';
import * as pdfParse from 'pdf-parse';

// Milvus 配置（从环境变量读取）
const MILVUS_HOST = process.env.MILVUS_HOST || 'localhost';
const MILVUS_PORT = parseInt(process.env.MILVUS_PORT || '19530', 10);
const MILVUS_URL = `${MILVUS_HOST}:${MILVUS_PORT}`;
const COLLECTION_NAME = process.env.EMPLOYEE_RULES_COLLECTION || 'employee_rules';
const DIMENSION = 1536;  // OpenAI text-embedding-3-small 维度

// Milvus 索引和搜索参数
const INDEX_PARAMS = {
  index_type: 'IVF_FLAT',
  metric_type: 'L2',
  nlist: 128,  // 聚类中心数（适合小数据集）
};

const SEARCH_PARAMS = {
  metric_type: 'L2',
  nprobe: 16,
};

// OpenAI 配置（从环境变量读取）
const OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
};

// OpenAI 实例
let _openaiInstance: ReturnType<typeof createOpenAI> | null = null;
function getOpenAI() {
  if (!_openaiInstance) {
    console.log('🔧 [Employee Rules] 初始化 OpenAI');
    console.log('   Base URL:', OPENAI_CONFIG.baseURL);
    
    if (!OPENAI_CONFIG.apiKey) {
      console.error('❌ OPENAI_API_KEY 未设置！');
      throw new Error('OPENAI_API_KEY is not set');
    }
    
    const hasNonASCII = /[^\x00-\x7F]/.test(OPENAI_CONFIG.apiKey);
    if (hasNonASCII) {
      console.error('❌ API Key 包含非 ASCII 字符！');
      throw new Error('API Key contains non-ASCII characters');
    }
    
    _openaiInstance = createOpenAI({
      apiKey: OPENAI_CONFIG.apiKey,
      baseURL: OPENAI_CONFIG.baseURL,
    });
  }
  return _openaiInstance;
}

// Milvus Client 实例
let _milvusClient: MilvusClient | null = null;
function getMilvusClient(): MilvusClient {
  if (!_milvusClient) {
    console.log(`🔗 [Employee Rules] 连接到 Milvus: ${MILVUS_URL}`);
    _milvusClient = new MilvusClient({ address: MILVUS_URL });
  }
  return _milvusClient;
}

// QueryCache 实例
let _queryCache: QueryCache | null = null;
function getQueryCache(): QueryCache {
  if (!_queryCache) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const similarityThreshold = parseFloat(process.env.CACHE_SIMILARITY_THRESHOLD || '0.95');
    const ttl = parseInt(process.env.CACHE_TTL || '3600', 10);
    
    console.log('🚀 [Employee Rules] 初始化查询缓存...');
    console.log(`   Redis: ${redisHost}:${redisPort}`);
    
    _queryCache = new QueryCache({
      redis: {
        host: redisHost,
        port: redisPort,
        password: process.env.REDIS_PASSWORD,
      },
      similarity_threshold: similarityThreshold,
      ttl: ttl,
      max_memory_cache: 100,
    });
  }
  return _queryCache;
}

// 读取文档
async function readDocument(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === '.txt') {
    console.log('📄 Reading TXT file...');
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error: any) {
      if (error.message.includes('invalid') || error.message.includes('malformed')) {
        console.log('   检测到编码问题，尝试 GBK 解码...');
        const iconv = await import('iconv-lite');
        const buffer = fs.readFileSync(filePath);
        return iconv.decode(buffer, 'gbk');
      }
      throw error;
    }
  } else if (ext === '.pdf') {
    console.log('📄 Reading PDF file...');
    const dataBuffer = fs.readFileSync(filePath);
    // @ts-ignore - pdf-parse has CommonJS/ESM compatibility issues
    const pdfData = await pdfParse(dataBuffer);
    return pdfData.text;
  } else {
    throw new Error(`不支持的文件格式: ${ext}`);
  }
}

// 索引员工规则到 Milvus
export async function indexEmployeeRules() {
  try {
    console.log('📄 开始索引员工规则文档...');
    
    // 查找文档
    const basePath = path.join(process.cwd(), 'data', 'employee-rules');
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
    console.log('');
    
    const { embeddings } = await embedMany({
      model: getOpenAI().embedding('text-embedding-3-small'),
      values: chunkTexts,
    });
    
    console.log(`✅ 成功生成 ${embeddings.length} 个嵌入向量`);
    console.log('');
    
    // 连接 Milvus
    const milvus = getMilvusClient();
    
    // 检查 collection 是否存在
    console.log('🔧 准备 Milvus collection...');
    const hasCollection = await milvus.hasCollection({ collection_name: COLLECTION_NAME });
    
    if (hasCollection.value) {
      console.log(`🗑️  删除旧 collection: ${COLLECTION_NAME}`);
      await milvus.dropCollection({ collection_name: COLLECTION_NAME });
    }
    
    // 创建 collection schema
    console.log(`📦 创建 collection: ${COLLECTION_NAME}`);
    await milvus.createCollection({
      collection_name: COLLECTION_NAME,
      fields: [
        {
          name: 'id',
          data_type: DataType.Int64,
          is_primary_key: true,
          autoID: true,
        },
        {
          name: 'vector',
          data_type: DataType.FloatVector,
          dim: DIMENSION,
        },
        {
          name: 'text',
          data_type: DataType.VarChar,
          max_length: 65535,
        },
      ],
    });
    
    console.log('');
    
    // 创建索引
    console.log('🔧 创建向量索引...');
    await milvus.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'vector',
      index_type: INDEX_PARAMS.index_type,
      metric_type: INDEX_PARAMS.metric_type,
      params: { nlist: INDEX_PARAMS.nlist },
    });
    
    // 插入数据
    console.log(`📥 插入 ${embeddings.length} 条数据...`);
    
    const data = embeddings.map((embedding, index) => ({
      vector: embedding,
      text: chunkTexts[index],
    }));
    
    await milvus.insert({
      collection_name: COLLECTION_NAME,
      data: data,
    });
    
    console.log('');
    
    // 加载 collection 到内存
    console.log('💾 加载 collection 到内存...');
    await milvus.loadCollection({ collection_name: COLLECTION_NAME });
    
    console.log('');
    console.log('✅ 索引完成！');
    console.log(`📊 Collection: ${COLLECTION_NAME}`);
    console.log(`📈 数据量: ${embeddings.length} 条`);
    console.log(`📍 Milvus: ${MILVUS_URL}`);
    
  } catch (error: any) {
    console.error('❌ 索引失败:', error.message);
    throw error;
  }
}

// 查询员工规则（使用 Milvus）
async function searchEmployeeRules(query: string, topK: number = 5) {
  console.log(`🔍 [Employee Rules] 搜索: "${query}"`);
  
  // 生成查询向量
  const { embedding: queryEmbedding } = await embed({
    model: getOpenAI().embedding('text-embedding-3-small'),
    value: query
  });

  // 检查缓存
  try {
    const cache = getQueryCache();
    const cachedResults = await cache.get(query, queryEmbedding);
    if (cachedResults) {
      console.log(`   ⚡ 从缓存返回结果`);
      return cachedResults;
    }
  } catch (error) {
    console.warn('   ⚠️  缓存读取失败:', error);
  }

  // 连接 Milvus
  const milvus = getMilvusClient();

  // 搜索
  console.log(`   🔍 Milvus 搜索 Top ${topK}...`);
  
  const searchResult = await milvus.search({
    collection_name: COLLECTION_NAME,
    data: [queryEmbedding],
    anns_field: 'vector',
    limit: topK,
    output_fields: ['text'],
    params: SEARCH_PARAMS,
  });

  if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
    console.log('   ⚠️  未找到结果');
    return [];
  }

  const results = searchResult.results.map((item: any) => ({
    text: item.text,
    score: item.score,
    distance: item.distance,
  }));

  console.log(`   ✅ 找到 ${results.length} 个结果`);

  // 缓存结果
  try {
    const cache = getQueryCache();
    await cache.set(query, queryEmbedding, results);
  } catch (error) {
    console.warn('   ⚠️  缓存写入失败:', error);
  }

  return results;
}

// 创建查询工具
function getEmployeeRulesTool() {
  return createTool({
    id: 'search_employee_rules',
    description: 'Search the employee rules handbook for information about company policies, benefits, leave policies, conduct guidelines, and other employee-related topics.',
    inputSchema: z.object({
      query: z.string().describe('The search query about employee rules or policies'),
    }),
    execute: async ({ context }) => {
      try {
        const results = await searchEmployeeRules(context.query, 5);
        
        if (!results || results.length === 0) {
          return {
            success: false,
            message: 'No relevant information found in the employee handbook.',
          };
        }

        // 格式化结果
        const formattedResults = results.map((r: any, idx: number) => 
          `[${idx + 1}] ${r.text}\n   (Score: ${r.score?.toFixed(2) || 'N/A'})`
        ).join('\n\n');

        return {
          success: true,
          results: formattedResults,
          sources: results,
        };
      } catch (error: any) {
        console.error('搜索失败:', error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
  });
}

// 创建 Employee Rules Agent
export const employeeRulerAgent = new Agent({
  name: 'Employee Rules Agent',
  description: `
    Specialized agent for answering questions about employee handbook, company policies, and workplace rules.
    This agent uses RAG (Retrieval-Augmented Generation) to search the employee handbook stored in Milvus vector database.
  `,
  instructions: `
    You are a knowledgeable HR assistant that helps employees understand company policies, benefits, and rules.
    
    IMPORTANT - Tool Usage:
    - ALWAYS use the 'search_employee_rules' tool to find information from the handbook
    - NEVER make up policies or rules - only use information from the tool results
    - If the tool returns no results, tell the user you couldn't find relevant information
    
    Response Format:
    1. Search the handbook using the tool
    2. Answer based ONLY on the retrieved information
    3. Quote specific sections when possible
    4. Be clear about what is and isn't covered in the handbook
    
    Language Matching:
    - ALWAYS respond in the SAME language as the user's question
    - If user writes in Chinese, respond entirely in Chinese
    - If user writes in English, respond entirely in English
    
    Be helpful, accurate, and professional in your responses.
  `,
  model: 'openai/gpt-4o-mini',
  tools: {
    search_employee_rules: getEmployeeRulesTool(),
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});

// 导出工具函数
export { searchEmployeeRules };
