import { 
  User, InsertUser, Conversation, InsertConversation, 
  Message, InsertMessage, ApiKey, InsertApiKey 
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProvider(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Conversation operations
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, conversation: Partial<Conversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // API key operations
  getApiKeysByUserId(userId: number): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(userId: number, apiKey: Partial<ApiKey>): Promise<ApiKey | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private apiKeys: Map<number, ApiKey>;
  private userIdCounter: number;
  private conversationIdCounter: number;
  private messageIdCounter: number;
  private apiKeyIdCounter: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.apiKeys = new Map();
    this.userIdCounter = 1;
    this.conversationIdCounter = 1;
    this.messageIdCounter = 1;
    this.apiKeyIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.provider === provider && user.providerId === providerId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conversation) => conversation.userId === userId,
    );
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const now = new Date();
    const conversation: Conversation = { 
      ...insertConversation, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: number, conversationData: Partial<Conversation>): Promise<Conversation | undefined> {
    const conversation = this.conversations.get(id);
    if (!conversation) return undefined;
    
    const updatedConversation = { 
      ...conversation, 
      ...conversationData,
      updatedAt: new Date()
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }

  async deleteConversation(id: number): Promise<boolean> {
    // Delete all messages in the conversation
    const messagesToDelete = Array.from(this.messages.values())
      .filter(message => message.conversationId === id);
    
    for (const message of messagesToDelete) {
      this.messages.delete(message.id);
    }
    
    // Delete the conversation
    return this.conversations.delete(id);
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    const message: Message = { 
      ...insertMessage, 
      id,
      timestamp: now
    };
    this.messages.set(id, message);
    
    // Update the conversation's updatedAt time
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.updatedAt = now;
      this.conversations.set(conversation.id, conversation);
    }
    
    return message;
  }

  // API key operations
  async getApiKeysByUserId(userId: number): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values()).find(
      (apiKey) => apiKey.userId === userId,
    );
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    const id = this.apiKeyIdCounter++;
    const apiKey: ApiKey = { ...insertApiKey, id };
    this.apiKeys.set(id, apiKey);
    return apiKey;
  }

  async updateApiKey(userId: number, apiKeyData: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const apiKey = Array.from(this.apiKeys.values()).find(
      (apiKey) => apiKey.userId === userId,
    );
    
    if (!apiKey) {
      // If no API key exists for this user, create a new one
      return this.createApiKey({ 
        userId, 
        ...apiKeyData 
      } as InsertApiKey);
    }
    
    const updatedApiKey = { ...apiKey, ...apiKeyData };
    this.apiKeys.set(apiKey.id, updatedApiKey);
    return updatedApiKey;
  }
}

export const storage = new MemStorage();
