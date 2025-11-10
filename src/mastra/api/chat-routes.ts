import { registerApiRoute } from '@mastra/core/server';

export const chatRoutes = [
  registerApiRoute('/agents/:agentId/chat', {
    method: 'POST',
    handler: async (c) => {
      try {
        const mastra = c.get('mastra');
        const agentId = c.req.param('agentId');
        const body = await c.req.json();
        const { message, conversationId = 'default' } = body;

        if (!message) {
          return c.json({ error: 'Message is required' }, 400);
        }

        // Get the agent
        const agent = mastra.getAgentById(agentId);
        
        if (!agent) {
          return c.json({ error: `Agent ${agentId} not found` }, 404);
        }

        // Generate response using the agent
        const result = await agent.generate(message, {
          memory: {
            thread: conversationId,
            resource: 'web-client',
          },
        });

        // Extract text from result
        const responseText = result.text || 'No response generated';

        return c.json({
          response: responseText,
          agentUsed: agentId,
          metadata: {
            conversationId,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        console.error('Chat API error:', error);
        return c.json({
          error: 'Internal server error',
          message: error.message,
        }, 500);
      }
    },
  }),
];

