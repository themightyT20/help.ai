import session from "express-session";
import { db, pool } from './db';
import connectPg from 'connect-pg-simple';
import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
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

  // Session store for authentication
  sessionStore: session.Store;
}

// Database storage implementation using Drizzle ORM
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
    return user;
  }

  async getUserByProvider(provider: string, providerId: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(
      and(
        eq(schema.users.provider, provider),
        eq(schema.users.providerId, providerId)
      )
    );
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(schema.users)
      .set(userData)
      .where(eq(schema.users.id, id))
      .returning();
    return updatedUser;
  }

  // Conversation operations
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.id, id));
    return conversation;
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, userId))
      .orderBy(desc(schema.conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const now = new Date();
    const conversationWithTimestamps = {
      ...insertConversation,
      createdAt: now,
      updatedAt: now
    };

    const [conversation] = await db
      .insert(schema.conversations)
      .values(conversationWithTimestamps)
      .returning();

    return conversation;
  }

  async updateConversation(id: number, conversationData: Partial<Conversation>): Promise<Conversation | undefined> {
    const dataWithUpdatedAt = {
      ...conversationData,
      updatedAt: new Date()
    };

    const [updatedConversation] = await db
      .update(schema.conversations)
      .set(dataWithUpdatedAt)
      .where(eq(schema.conversations.id, id))
      .returning();

    return updatedConversation;
  }

  async deleteConversation(id: number): Promise<boolean> {
    // Delete associated messages first
    await db
      .delete(schema.messages)
      .where(eq(schema.messages.conversationId, id));

    // Then delete the conversation
    const [deleted] = await db
      .delete(schema.conversations)
      .where(eq(schema.conversations.id, id))
      .returning();

    return !!deleted;
  }

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.id, id));

    return message;
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.timestamp);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const messageWithTimestamp = {
      ...insertMessage,
      timestamp: new Date()
    };

    // Ensure metadata is present as null if not provided
    if (messageWithTimestamp.metadata === undefined) {
      messageWithTimestamp.metadata = null;
    }

    const [message] = await db
      .insert(schema.messages)
      .values(messageWithTimestamp)
      .returning();

    // Update the conversation's updatedAt timestamp
    await this.updateConversation(insertMessage.conversationId, { updatedAt: new Date() });

    return message;
  }

  // API key operations
  async getApiKeysByUserId(userId: number): Promise<ApiKey | undefined> {
    const [apiKey] = await db
      .select()
      .from(schema.apiKeys)
      .where(eq(schema.apiKeys.userId, userId));

    return apiKey;
  }

  async createApiKey(insertApiKey: InsertApiKey): Promise<ApiKey> {
    // Ensure API key fields are at least null if not provided
    const apiKeyData = {
      ...insertApiKey,
      togetherApiKey: insertApiKey.togetherApiKey ?? null,
      stabilityApiKey: insertApiKey.stabilityApiKey ?? null
    };

    const [apiKey] = await db
      .insert(schema.apiKeys)
      .values(apiKeyData)
      .returning();

    return apiKey;
  }

  async updateApiKey(userId: number, apiKeyData: Partial<ApiKey>): Promise<ApiKey | undefined> {
    const existingApiKey = await this.getApiKeysByUserId(userId);

    if (!existingApiKey) {
      // Create a new API key if one doesn't exist
      return this.createApiKey({ 
        userId, 
        ...apiKeyData,
        togetherApiKey: apiKeyData.togetherApiKey ?? null, 
        stabilityApiKey: apiKeyData.stabilityApiKey ?? null 
      } as InsertApiKey);
    }

    const [updatedApiKey] = await db
      .update(schema.apiKeys)
      .set(apiKeyData)
      .where(eq(schema.apiKeys.userId, userId))
      .returning();

    return updatedApiKey;
  }
}

// Use DatabaseStorage instead of MemStorage
export const storage = new DatabaseStorage();