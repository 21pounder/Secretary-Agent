import axios from 'axios';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface AgentInfo {
  name: string;
  description: string;
  capabilities: string[];
}

class MastraAPIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * 与 Secretary Agent 对话
   */
  async chat(message: string, conversationId?: string): Promise<{
    response: string;
    agentUsed?: string;
    metadata?: any;
  }> {
    try {
      const response = await axios.post(`/agents/secretaryAgent/chat`, {
        message,
        conversationId: conversationId || 'default',
      });

      return {
        response: response.data.response || response.data.text || response.data.content,
        agentUsed: response.data.agentUsed,
        metadata: response.data.metadata,
      };
    } catch (error: any) {
      console.error('Chat API error:', error);
      throw new Error(error.response?.data?.message || '连接 AI 助手失败，请检查后端服务是否运行');
    }
  }

  /**
   * 获取可用的 Agents 列表
   */
  async getAgents(): Promise<AgentInfo[]> {
    try {
      const response = await axios.get(`${this.baseURL}/agents`);
      return response.data.agents || [];
    } catch (error) {
      console.error('Get agents error:', error);
      return this.getDefaultAgents();
    }
  }

  /**
   * 默认 Agent 信息（如果 API 不可用）
   */
  private getDefaultAgents(): AgentInfo[] {
    return [
      {
        name: 'Secretary Agent',
        description: '主协调助手，负责任务路由和管理',
        capabilities: ['任务路由', '火车票查询', '体育新闻', '记忆管理'],
      },
      {
        name: 'Data Analyze Agent',
        description: 'MySQL 数据库查询和分析专家',
        capabilities: ['SQL 查询', '数据分析', '报表生成'],
      },
      {
        name: 'Hot News Agent',
        description: '中文平台热点新闻抓取',
        capabilities: ['微博热搜', '知乎热榜', 'B站热门'],
      },
      {
        name: 'Employee Rules Agent',
        description: '员工规章制度查询（RAG 驱动）',
        capabilities: ['政策查询', '规章制度', '员工手册'],
      },
    ];
  }

  /**
   * 健康检查
   * 优化: 直接使用已知有效的 /agents 端点，避免冗余的 404 请求
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseURL}/agents`, {
        timeout: 3000,
      });
      return true;
    } catch (e) {
      console.log('Backend health check failed:', e);
      return false;
    }
  }
}

export const apiClient = new MastraAPIClient();
