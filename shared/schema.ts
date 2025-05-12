import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - stores user information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").unique(),
  profilePicture: text("profile_picture"),
  provider: text("provider"), // "google", "discord", or "local"
  providerId: text("provider_id"), // OAuth provider ID
  memory: jsonb("memory"), // Store conversation memory/context
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  profilePicture: true,
  provider: true,
  providerId: true,
});

// Conversations table - stores chat sessions
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

// Messages table - stores individual messages within conversations
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  content: text("content").notNull(),
  role: text("role").notNull(), // "user" or "assistant"
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  metadata: jsonb("metadata"), // For storing additional data like source URLs, code download links, etc.
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  content: true,
  role: true,
  metadata: true,
});

// API keys table - for storing user API keys
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  togetherApiKey: text("together_api_key"),
  duckduckgoApiKey: text("duckduckgo_api_key"),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).pick({
  userId: true,
  togetherApiKey: true,
  duckduckgoApiKey: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

// Settings schema for user preferences
export const settingsSchema = z.object({
  theme: z.enum(["light", "dark", "system"]).default("system"),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(256).max(4096).default(1024),
  saveConversations: z.boolean().default(true),
  useLocalStorageOnly: z.boolean().default(false),
});

export type Settings = z.infer<typeof settingsSchema>;