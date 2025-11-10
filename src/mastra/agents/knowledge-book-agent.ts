// 🔧 必须在最顶部加载环境变量！
import { config as loadEnv } from 'dotenv';
loadEnv();

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { MDocument } from '@mastra/rag';
import { createTool } from '@mastra/core/tools';
import { embedMany, embed, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { QueryCache } from '../cache/query-cache';
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

// Milvus 配置（从环境变量读取）
const MILVUS_HOST = process.env.MILVUS_HOST || 'localhost';
const MILVUS_PORT = parseInt(process.env.MILVUS_PORT || '19530', 10);
const MILVUS_URL = `${MILVUS_HOST}:${MILVUS_PORT}`;
const COLLECTION_NAME = process.env.MILVUS_COLLECTION || 'knowledge_book';
const DIMENSION = 1536;  // OpenAI text-embedding-3-small 维度

// Milvus 索引和搜索参数
const INDEX_PARAMS = {
  index_type: 'IVF_FLAT',
  metric_type: 'L2',
  nlist: 256,  // 聚类中心数（对于 3435 个向量，sqrt(3435) ≈ 59，4*sqrt ≈ 236）
};

const SEARCH_PARAMS = {
  metric_type: 'L2',  // 必须与索引的 metric_type 一致
  nprobe: 16,  // 搜索的聚类数（nprobe <= nlist，越大越准确但越慢）
};

// RAG 优化开关（通过环境变量控制）
const RAG_CONFIG = {
  enableQueryRewrite: process.env.ENABLE_QUERY_REWRITE !== 'false',  // 默认启用
  enableReranker: process.env.ENABLE_RERANKER !== 'false',  // 默认启用
  queryRewriteCount: parseInt(process.env.QUERY_REWRITE_COUNT || '2', 10),  // 生成几个改写
  rerankerTopK: parseInt(process.env.RERANKER_TOPK || '5', 10),  // Reranker 返回前几个
  rerankerType: process.env.RERANKER_TYPE || 'auto',  // 'embedding', 'llm', 'auto'
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
    console.log('🔧 [Knowledge Book] 初始化 OpenAI（从环境变量）');
    console.log('   Base URL:', OPENAI_CONFIG.baseURL);
    console.log('   API Key:', OPENAI_CONFIG.apiKey.substring(0, 20) + '...');

    if (!OPENAI_CONFIG.apiKey) {
      console.error('❌ OPENAI_API_KEY 未设置！');
      throw new Error('OPENAI_API_KEY is not set in environment variables');
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

// QueryCache 实例
let _queryCache: QueryCache | null = null;
function getQueryCache(): QueryCache {
  if (!_queryCache) {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
    const similarityThreshold = parseFloat(process.env.CACHE_SIMILARITY_THRESHOLD || '0.50');
    const ttl = parseInt(process.env.CACHE_TTL || '3600', 10);
    
    console.log('🚀 [Knowledge Book] 初始化查询缓存...');
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

// 初始化 Milvus 客户端
let _milvusClient: MilvusClient | null = null;
export function getMilvusClient(): MilvusClient {
  if (!_milvusClient) {
    console.log('🔧 [Knowledge Book] 初始化 Milvus 客户端...');
    console.log(`   地址: ${MILVUS_URL}`);
    console.log(`   Collection: ${COLLECTION_NAME}`);

    _milvusClient = new MilvusClient({
      address: MILVUS_URL,
    });
  }
  return _milvusClient;
}

/**
 * 读取文档文件（TXT）
 */
async function readDocument(filePath: string): Promise<string> {
  try {
    console.log('📄 读取 TXT 文件...');
    
    // 尝试 UTF-8 编码
    try {
      const text = fs.readFileSync(filePath, 'utf-8');
      return text;
    } catch (e) {
      // 如果 UTF-8 失败，尝试 GBK
      console.log('⚠️  UTF-8 编码失败，尝试 GBK...');
      const iconv = await import('iconv-lite');
      const buffer = fs.readFileSync(filePath);
      const text = iconv.default.decode(buffer, 'gbk');
      return text;
    }
  } catch (error) {
    console.error('Error reading document:', error);
    throw error;
  }
}

/**
 * 索引《盗墓笔记》到 Milvus
 */
export async function indexKnowledgeBook() {
  try {
    console.log('📚 开始索引《盗墓笔记》文档到 Milvus...');
    
    const docPath = path.join(process.cwd(), 'data/dmbj.txt');
    
    if (!fs.existsSync(docPath)) {
      console.error(`⚠️  文档文件不存在: ${docPath}`);
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
      maxSize: 512,      // 小说内容可以稍大一些
      overlap: 50,       // 保持上下文连贯性
    });
    
    const chunkDocs = doc.getDocs();
    const chunkTexts = chunkDocs.map(chunk => chunk.text);
    console.log(`✂️  分割成 ${chunkTexts.length} 个块`);
    console.log('');
    
    // 生成嵌入
    console.log('🧮 生成嵌入向量...');
    console.log(`   ⏳ 正在处理 ${chunkTexts.length} 个文本块，请耐心等待...`);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 创建 collection
    console.log(`📦 创建新 collection: ${COLLECTION_NAME} (维度: ${DIMENSION})`);
    await milvus.createCollection({
      collection_name: COLLECTION_NAME,
      dimension: DIMENSION,
      fields: [
        { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
        { name: 'vector', data_type: DataType.FloatVector, dim: DIMENSION },
        { name: 'text', data_type: DataType.VarChar, max_length: 65535 },
        { name: 'source', data_type: DataType.VarChar, max_length: 256 },
        { name: 'chunk_index', data_type: DataType.Int64 },
        { name: 'total_chunks', data_type: DataType.Int64 },
      ],
    });
    
    // 创建索引
    console.log('🔨 创建向量索引...');
    console.log(`   索引类型: ${INDEX_PARAMS.index_type}`);
    console.log(`   距离度量: ${INDEX_PARAMS.metric_type}`);
    console.log(`   参数: nlist=${INDEX_PARAMS.nlist}`);
    await milvus.createIndex({
      collection_name: COLLECTION_NAME,
      field_name: 'vector',
      index_type: INDEX_PARAMS.index_type,
      metric_type: INDEX_PARAMS.metric_type,
      params: { nlist: INDEX_PARAMS.nlist },
    });
    
    // 准备数据
    console.log('💾 插入数据到 Milvus...');
    const data = chunkTexts.map((text, index) => ({
      vector: embeddings[index],
      text: text.substring(0, 65535), // Milvus VarChar 限制
      source: 'dmbj.txt',
      chunk_index: index,
      total_chunks: chunkTexts.length,
    }));
    
    // 批量插入（每次 100 条）
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      await milvus.insert({
        collection_name: COLLECTION_NAME,
        data: batch,
      });
      console.log(`   📥 已插入 ${Math.min(i + batchSize, data.length)}/${data.length}`);
      await new Promise(resolve => setTimeout(resolve, 200)); // 防止过载
    }
    
    // 加载 collection 到内存
    console.log('⚡ 加载 collection 到内存...');
    await milvus.loadCollectionSync({ collection_name: COLLECTION_NAME });
    
    console.log('');
    console.log('✅ 《盗墓笔记》索引完成！');
    console.log(`📊 总共索引了 ${chunkTexts.length} 个文本块`);
    console.log('');
  } catch (error: any) {
    console.log('');
    console.log('❌ 索引失败');
    console.log('');
    
    // 只打印关键错误信息，避免打印大量文本内容
    if (error.statusCode === 401) {
      console.log('🔐 认证失败 - API Key 无效或已过期');
      console.log('');
      console.log('解决方案：');
      console.log('  1. 检查 knowledge-book-agent.ts 中的 OPENAI_CONFIG');
      console.log('  2. 确认 API Key 是否正确');
      console.log('  3. 确认 Base URL 是否正确');
    } else {
      console.log('错误信息:', error.message || '未知错误');
      if (error.code) {
        console.log('错误代码:', error.code);
      }
    }
    console.log('');
    throw error;
  }
}

/**
 * 提取关键词（针对小说内容优化）
 */
function extractKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // 1. 提取数字
  const numbers = query.match(/\d+/g);
  if (numbers) {
    keywords.push(...numbers);
  }
  
  // 2. 小说相关关键词
  const importantWords = [
    // 人物相关
    '吴邪', '王胖子', '张起灵', '闷油瓶', '阿宁', '潘子', '三叔',
    // 地点相关
    '古墓', '七星', '云顶', '西沙', '蛇沼', '长白山',
    // 物品相关
    '青铜', '玉俑', '血尸', '蛇', '粽子',
    // 动作相关
    '盗墓', '探险', '发现', '逃跑',
    // 通用词
    '章', '回', '第'
  ];
  
  importantWords.forEach(word => {
    if (query.includes(word)) {
      keywords.push(word);
    }
  });
  
  return [...new Set(keywords)];
}

/**
 * RRF 融合
 */
function reciprocalRankFusion<T extends { id: string }>(
  sources: Array<Array<T>>,
  k: number = 60
): T[] {
  const scoreMap = new Map<string, { item: T; score: number }>();
  
  sources.forEach(sourceResults => {
    sourceResults.forEach((item, rank) => {
      const id = item.id;
      const rrfScore = 1 / (k + rank + 1);
      
      if (!scoreMap.has(id)) {
        scoreMap.set(id, { item, score: 0 });
      }
      scoreMap.get(id)!.score += rrfScore;
    });
  });
  
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(entry => entry.item);
}

/**
 * 查询改写：生成多个语义相似的查询变体
 */
async function rewriteQuery(originalQuery: string): Promise<string[]> {
  // 检查是否启用查询改写
  if (!RAG_CONFIG.enableQueryRewrite) {
    console.log('🔄 [Query Rewrite] 已禁用，使用原查询');
    return [originalQuery];
  }

  console.log('🔄 [Query Rewrite] 生成查询变体...');

  try {
    const prompt = `你是查询改写专家。给定用户对小说《盗墓笔记》的查询，生成${RAG_CONFIG.queryRewriteCount}个语义相似但表达不同的查询变体。

原始查询: "${originalQuery}"

要求：
1. 保持原意，不要改变查询意图
2. 使用不同的表达方式（同义词、倒装等）
3. 提取核心人物/地点/事件
4. 适合小说情节检索

输出JSON格式（数组，只包含改写后的查询，不要原查询）：
["改写查询1", "改写查询2"]

示例：
输入："吴邪第一次进古墓是怎么回事"
输出：["吴邪初次探索古墓的经历", "吴邪首次下墓的情节"]`;

    const { text } = await generateText({
      model: getOpenAI()('gpt-4o-mini'),
      prompt: prompt,
      temperature: 0.7,
    });

    const rewrites = JSON.parse(text);

    console.log(`   ✅ 生成了 ${rewrites.length} 个查询变体`);
    rewrites.forEach((rw: string, idx: number) => {
      console.log(`      ${idx + 1}. "${rw}"`);
    });

    return [originalQuery, ...rewrites];  // 包含原查询
  } catch (error: any) {
    console.warn('   ⚠️  查询改写失败，使用原查询:', error.message);
    return [originalQuery];
  }
}

/**
 * LLM-based Reranker：使用 LLM 对检索结果进行重排序
 */
async function llmRerank(query: string, results: any[], topK: number = 5): Promise<any[]> {
  if (results.length === 0) {
    return [];
  }

  console.log(`🎯 [LLM Reranker] 使用 GPT-4o-mini 重排序 ${results.length} 个结果...`);

  try {
    // 构建评分 prompt
    const documentsText = results.map((r, idx) => {
      const text = r.metadata?.text || r.text || '';
      return `[文档${idx}]\n${text.substring(0, 300)}...\n`;
    }).join('\n');

    const prompt = `你是文档相关性评分专家。给定查询和多个文档片段，为每个文档打分（0-100）。

查询: "${query}"

文档片段:
${documentsText}

要求：
1. 评估每个文档与查询的相关性
2. 考虑语义匹配和内容质量
3. 打分范围 0-100（100最相关）

输出JSON格式（数组，每个元素是文档索引和分数）：
[{"index": 0, "score": 85}, {"index": 1, "score": 72}, ...]`;

    const { text } = await generateText({
      model: getOpenAI()('gpt-4o-mini'),
      prompt: prompt,
      temperature: 0.3,
    });

    const scores = JSON.parse(text);

    // 按分数排序
    scores.sort((a: any, b: any) => b.score - a.score);

    // 返回重排序后的结果
    const rerankedResults = scores
      .slice(0, topK)
      .map((s: any) => ({
        ...results[s.index],
        rerank_score: s.score,
      }));

    console.log(`   ✅ LLM 重排序完成，返回前 ${rerankedResults.length} 个结果`);
    rerankedResults.forEach((r: any, idx: number) => {
      console.log(`      ${idx + 1}. 分数=${r.rerank_score} (原分数=${r.score?.toFixed(4)})`);
    });

    return rerankedResults;
  } catch (error: any) {
    console.warn('   ⚠️  LLM Reranker 失败，返回原结果:', error.message);
    return results.slice(0, topK);
  }
}

/**
 * 余弦相似度计算
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Embedding-based Reranker：使用 Embedding 相似度进行重排序
 * 类似 BGE reranker 的工作原理，但使用 OpenAI embeddings
 */
async function embeddingRerank(query: string, results: any[], topK: number = 5): Promise<any[]> {
  if (results.length === 0) {
    return [];
  }

  console.log(`🎯 [Embedding Reranker] 使用语义相似度重排序 ${results.length} 个结果...`);

  try {
    // 1. 生成 query 的 embedding
    const { embedding: queryEmbedding } = await embed({
      model: getOpenAI().embedding('text-embedding-3-small'),
      value: query,
    });

    // 2. 生成所有文档的 embeddings
    const documents = results.map(r => r.metadata?.text || r.text || '');
    const { embeddings: docEmbeddings } = await embedMany({
      model: getOpenAI().embedding('text-embedding-3-small'),
      values: documents,
    });

    // 3. 计算余弦相似度
    const scoredResults = results.map((result, index) => {
      const similarity = cosineSimilarity(queryEmbedding, docEmbeddings[index]);
      return {
        ...result,
        rerank_score: similarity * 100,  // 转换为 0-100 分数
      };
    });

    // 4. 按相似度排序
    scoredResults.sort((a, b) => b.rerank_score - a.rerank_score);

    // 5. 返回 Top-K
    const topResults = scoredResults.slice(0, topK);

    console.log(`   ✅ Embedding 重排序完成，返回前 ${topResults.length} 个结果`);
    topResults.forEach((r: any, idx: number) => {
      console.log(`      ${idx + 1}. 相似度=${r.rerank_score.toFixed(2)} (原分数=${r.score?.toFixed(4)})`);
    });

    return topResults;
  } catch (error: any) {
    console.warn('   ⚠️  Embedding Reranker 失败，fallback 到 LLM Reranker:', error.message);
    return await llmRerank(query, results, topK);
  }
}

/**
 * 智能 Reranker：根据配置和查询复杂度自动选择最佳 Reranker
 */
async function rerankResults(query: string, results: any[], topK: number = 5): Promise<any[]> {
  if (results.length === 0) {
    return [];
  }

  // 检查是否启用 Reranker
  if (!RAG_CONFIG.enableReranker) {
    console.log('🎯 [Reranker] 已禁用，返回原结果');
    return results.slice(0, topK);
  }

  const rerankerType = RAG_CONFIG.rerankerType;

  // 根据配置选择 Reranker
  if (rerankerType === 'embedding') {
    // 强制使用 Embedding Reranker
    return await embeddingRerank(query, results, topK);
  } else if (rerankerType === 'llm') {
    // 强制使用 LLM
    return await llmRerank(query, results, topK);
  } else {
    // 自动模式：根据查询复杂度智能选择
    const isComplexQuery = 
      query.length > 100 ||                    // 长查询
      query.includes('为什么') ||              // 需要推理
      query.includes('怎么') ||
      query.includes('why') ||
      query.includes('how') ||
      query.split('').filter(c => c === '？' || c === '?').length > 1;  // 多个问题

    if (isComplexQuery) {
      // 复杂查询用 LLM（理解力更强，可以处理推理性问题）
      console.log('   📝 检测到复杂查询，使用 LLM Reranker');
      return await llmRerank(query, results, topK);
    } else {
      // 简单查询用 Embedding Reranker（更快，基于语义相似度）
      console.log('   ⚡ 简单查询，使用 Embedding Reranker（基于语义相似度）');
      return await embeddingRerank(query, results, topK);
    }
  }
}

/**
 * 多召回源检索（使用 Milvus）
 */
async function multiSourceRetrieval(query: string, topK: number = 5) {
  console.log('🔍 [Knowledge Book] 开始多召回源检索...');
  console.log(`   查询: "${query}"`);

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

  // 🔄 查询改写：生成多个查询变体
  const queries = await rewriteQuery(query);
  console.log(`   📝 查询变体总数: ${queries.length}`);

  // 生成向量（为所有查询变体）
  const { embeddings } = await embedMany({
    model: getOpenAI().embedding('text-embedding-3-small'),
    values: queries
  });

  // 连接 Milvus
  const milvus = getMilvusClient();

  // 并行检索
  console.log(`   执行 ${queries.length} 路并行检索...`);
  const allResults = await Promise.all(
    embeddings.map(async (queryVector, index) => {
      try {
        const searchResult = await milvus.search({
          collection_name: COLLECTION_NAME,
          data: [queryVector],
          anns_field: 'vector',  // 必需：指定向量字段名称
          limit: topK * 2,
          metric_type: SEARCH_PARAMS.metric_type,  // 必需：距离度量（必须与索引一致）
          output_fields: ['text', 'source', 'chunk_index', 'total_chunks'],
          params: { nprobe: SEARCH_PARAMS.nprobe },  // 搜索参数：平衡速度和准确度
        });

        console.log(`   🔍 检索源 ${index + 1} 原始结果:`, {
          status: searchResult.status,
          resultsLength: searchResult.results?.length,
          hasData: !!searchResult.results
        });

        // 转换为统一格式 - Milvus 2.x SDK 返回格式检查
        const rawResults = searchResult.results || [];
        const results = rawResults.map((hit: any) => ({
          id: String(hit.id || hit.ID || Math.random()),  // ID 字段可能是 id 或 ID
          score: hit.score || hit.distance || 0,
          metadata: {
            text: hit.text || '',
            source: hit.source || '',
            chunk_index: hit.chunk_index ?? -1,
            total_chunks: hit.total_chunks ?? 0,
          }
        }));

        console.log(`   📊 检索源 ${index + 1}: 找到 ${results.length} 个结果 ${results.length > 0 ? `(最佳分数: ${results[0]?.score.toFixed(4)})` : ''}`);
        return results;
      } catch (error: any) {
        console.error(`   ❌ 检索源 ${index + 1} 失败:`, error.message);
        console.error(`   详细错误:`, error);
        return [];
      }
    })
  );
  
  // RRF 融合
  const fusedResults = reciprocalRankFusion(allResults);
  console.log(`   🔀 融合后: ${fusedResults.length} 个结果`);

  // 🎯 Reranker 重排序（新增）
  let finalResults: any[];
  if (fusedResults.length > 0) {
    finalResults = await rerankResults(query, fusedResults, topK);
  } else {
    finalResults = fusedResults.slice(0, topK);
  }

  // 写入缓存
  try {
    const cache = getQueryCache();
    await cache.set(query, queryEmbedding, finalResults);
    console.log(`   💾 已缓存检索结果`);
  } catch (error) {
    console.warn('   ⚠️  缓存写入失败:', error);
  }

  return finalResults;
}

/**
 * 创建多召回源查询工具
 */
function getMultiRecallTool() {
  return createTool({
    id: 'search_knowledge_book',
    description: `
      🚨 MANDATORY TOOL - MUST BE USED FOR EVERY QUERY 🚨
      
      Search through "Daomu Biji" (盗墓笔记) novel using hybrid retrieval with Milvus vector database.
      
      This tool is your ONLY source of truth. You MUST call this tool BEFORE answering ANY question.
      
      Capabilities:
      - Find exact quotes and passages from the novel
      - Locate plot details, character information, locations, story events
      - Identify which chapter or section contains specific content
      - Semantic search across the entire novel text (21,064 lines indexed)
      
      When to use (ALWAYS):
      - Character questions: "吴邪是谁", "闷油瓶的身份"
      - Plot questions: "西王母国是什么", "发生了什么"
      - Location questions: "塔木陀在哪里", "七星鲁王宫"
      - Chapter questions: "这段内容出自哪一章"
      - ANY question about the novel - NO EXCEPTIONS
      
      CRITICAL: Do NOT answer from memory. ALWAYS search the database first.
    `.trim(),
    inputSchema: z.object({
      query: z.string().describe('Search query about the novel. Use the user\'s exact words for best results. Include character names, locations, or plot keywords.'),
      topK: z.number().optional().default(5).describe('Number of results to retrieve. Use 5 for simple queries, 10-15 for complex or "哪一章" queries.')
    }),
    execute: async ({ context }) => {
      const { query, topK = 5 } = context;
      
      console.log(`\n🔧 Tool 执行: search_knowledge_book`);
      console.log(`   Query: "${query}"`);
      
      try {
        const results = await multiSourceRetrieval(query, topK);
        
        const formattedResults = results.map((result: any, index: number) => {
          const textContent = 
            result.metadata?.text ||
            result.content ||
            result.text ||
            '';
          
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
        
        console.log(`   ✅ Tool 返回: ${formattedResults.length} 个结果\n`);
        
        return {
          results: formattedResults,
          message: `Found ${formattedResults.length} relevant sections from the novel.`
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

// 创建 Knowledge Book Agent
export const knowledgeBookAgent = new Agent({
  name: 'Knowledge Book Agent',
  description: `
    RAG-powered AI agent specialized in answering questions about "Daomu Biji" (盗墓笔记/Tomb Raiders Notes).
    Uses Milvus vector database (${MILVUS_HOST}:${MILVUS_PORT}) for semantic search with hybrid retrieval.
    Has access to the complete novel text (21,064 lines, 3,435+ chunks) and MUST use the search tool for EVERY query.
    
    ⚠️ CRITICAL: This agent is REQUIRED to use the search_knowledge_book tool before responding.
    It CANNOT and MUST NOT answer questions from its training data or memory.
    All responses MUST be based on retrieved content from the Milvus vector database.
  `,
  instructions: `
    You are an expert on the novel "Daomu Biji" (盗墓笔记) by Nanpai Sanshu (南派三叔).
    
    **Vector Database**: Milvus at ${MILVUS_HOST}:${MILVUS_PORT}
    **Search Strategy**: Hybrid retrieval with RRF (Reciprocal Rank Fusion)
    
    ## 🚨 CRITICAL WORKFLOW (MANDATORY - NEVER SKIP):
    
    ⚠️ **ABSOLUTE RULE #1: ALWAYS USE THE TOOL FIRST**
    - You MUST call search_knowledge_book tool for EVERY user query
    - You are FORBIDDEN from answering without searching the database first
    - Even if you think you "know" the answer, you MUST search the database
    - Even for simple questions, you MUST use the tool
    - NO EXCEPTIONS - failure to use the tool means failure to complete the task
    
    ⚠️ **ABSOLUTE RULE #2: NEVER MAKE UP CONTENT**
    - Base your answer ONLY on retrieved content from the search tool
    - If the tool returns no results, say "未找到相关内容" (no relevant content found)
    - Never fabricate plot details, character information, or quotes
    - Never rely on your training data - ONLY use search results
    
    ⚠️ **ABSOLUTE RULE #3: ALWAYS QUOTE SOURCES**
    - Include direct quotes from the retrieved text in your response
    - Show the chunk_index or source reference
    - Let users verify the information
    
    ## Execution Steps (Follow Strictly):
    
    Step 1: Receive user query
    Step 2: IMMEDIATELY call search_knowledge_book(query="<user's question>", topK=5)
    Step 3: Wait for search results
    Step 4: IF results found → Format response with quotes
           ELSE → State "未找到相关内容" and ask user to rephrase
    Step 5: Respond to user
    
    ## Language Matching (CRITICAL)
    - Respond in the SAME language as the user's question
    - Chinese question → Chinese answer (including all labels, quotes, notes)
    - English question → English answer
    
    ## 🔍 Search Parameters:
    - Default topK: 5 (retrieve top 5 most relevant passages)
    - Increase topK to 10-15 for complex queries or "哪一章" questions
    - Use exact quotes from user's question in your search query
    - For "出自哪一章" queries, include the content text in search query
    
    ## 📊 Response Format (STRICT TEMPLATE)
    
    ### When information IS FOUND (ALWAYS use this format):
    
    **For Chinese queries:**
    📖 **盗墓笔记查询**
    
    **💡 回答：**
    [基于检索内容的准确回答]
    
    **📚 原文引用：**
    > "[直接引用小说中的相关段落]"
    
    **📌 补充：** [额外说明（可选）]
    
    **For English queries:**
    📖 **Daomu Biji Query**
    
    **💡 Answer:**
    [Accurate answer based on retrieved content]
    
    **📚 Quote from Novel:**
    > "[Direct quote from the novel]"
    
    **📌 Note:** [Additional information (optional)]
    
    ### When information is NOT FOUND:
    
    **For Chinese:**
    ⚠️ 抱歉，在《盗墓笔记》中未找到相关内容。请尝试换个方式提问，或提供更多细节。
    
    **For English:**
    ⚠️ Sorry, I couldn't find relevant information in the novel. Please try rephrasing your question.
    
    ## Quality Guidelines
    ✓ Accuracy over speculation
    ✓ Direct quotes when possible
    ✓ Maintain story context
    ✓ Respect the original narrative
    ✓ Clear about what's not found
  `,
  model: 'openai/gpt-4o-mini',
  tools: {
    search_knowledge_book: getMultiRecallTool(),
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
  }),
});

/**
 * 获取缓存统计
 */
export function getKnowledgeBookCacheStats() {
  try {
    const cache = getQueryCache();
    return cache.getStats();
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    return null;
  }
}

/**
 * 清除缓存
 */
export async function clearKnowledgeBookCache() {
  try {
    const cache = getQueryCache();
    await cache.clear();
    console.log('✅ Knowledge Book 缓存已清除');
  } catch (error) {
    console.error('清除缓存失败:', error);
    throw error;
  }
}

