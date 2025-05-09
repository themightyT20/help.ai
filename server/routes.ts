import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

import { z } from "zod";
import { insertConversationSchema } from "@shared/schema";
import dotenv from "dotenv";
import { initAuthRoutes } from "./api/auth";
import { initChatRoutes } from "./api/chat";
import { initSearchRoutes } from "./api/search";
import { initCodeRoutes } from "./api/code";
import { isAuthenticated } from "./middleware/auth";
import { setupAuth } from "./auth";

dotenv.config();

// Session store is handled in auth.ts

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup authentication with Passport
  setupAuth(app);
  
  // Initialize API routes
  initAuthRoutes(app);
  initChatRoutes(app);
  initSearchRoutes(app);
  initCodeRoutes(app);

  // Current user endpoint
  app.get("/api/me", isAuthenticated, (req: Request, res: Response) => {
    res.json(req.user);
  });
  
  // Conversations endpoints
  app.get("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const conversations = await storage.getConversationsByUserId(userId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });
  
  app.post("/api/conversations", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const validatedData = insertConversationSchema.parse({
        ...req.body,
        userId,
      });
      
      const conversation = await storage.createConversation(validatedData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create conversation" });
      }
    }
  });
  
  app.get("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const conversationId = parseInt(req.params.id);
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      res.json({
        conversation,
        messages,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });
  
  app.delete("/api/conversations/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const conversationId = parseInt(req.params.id);
      
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteConversation(conversationId);
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });
  
  // API keys management
  app.get("/api/api-keys", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const apiKeys = await storage.getApiKeysByUserId(userId);
      
      // Don't return actual keys, just whether they exist
      const sanitizedKeys = apiKeys ? {
        hasTogetherApiKey: Boolean(apiKeys.togetherApiKey),
        hasDuckduckgoApiKey: Boolean(apiKeys.duckduckgoApiKey),
      } : {
        hasTogetherApiKey: false,
        hasDuckduckgoApiKey: false
      };
      
      res.json(sanitizedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });
  
  app.post("/api/api-keys", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const { togetherApiKey, duckduckgoApiKey } = req.body;
      
      const updatedKeys = await storage.updateApiKey(userId, {
        togetherApiKey,
        duckduckgoApiKey,
      });
      
      res.status(200).json({
        hasTogetherApiKey: Boolean(updatedKeys?.togetherApiKey),
        hasDuckduckgoApiKey: Boolean(updatedKeys?.duckduckgoApiKey),
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update API keys" });
    }
  });
  
  return httpServer;
}
