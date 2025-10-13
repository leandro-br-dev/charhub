import { ResponseGenerationAgent } from '../agents/responseGenerationAgent';
import { ConversationManagerAgent } from '../agents/conversationManagerAgent';

class AgentService {
  private responseGenerationAgent: ResponseGenerationAgent;
  private conversationManagerAgent: ConversationManagerAgent;

  constructor() {
    this.responseGenerationAgent = new ResponseGenerationAgent();
    this.conversationManagerAgent = new ConversationManagerAgent();
  }

  getResponseGenerationAgent(): ResponseGenerationAgent {
    return this.responseGenerationAgent;
  }

  getConversationManagerAgent(): ConversationManagerAgent {
    return this.conversationManagerAgent;
  }
}

export const agentService = new AgentService();