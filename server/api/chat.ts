import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { isAuthenticated } from "../middleware/auth";
import fetch from "node-fetch";

const messageRequestSchema = z.object({
  message: z.string(),
  conversationId: z.number(),
});

export function initChatRoutes(app: Express) {
  // Send a message to the AI assistant
  app.post("/api/chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = messageRequestSchema.parse(req.body);

      // Handle guest mode
      const isGuestMode = req.headers['x-guest-mode'] === 'true';
      const userId = isGuestMode ? 0 : (req.user as any).id;

      // For guest mode, we skip conversation validation
      let conversation;
      if (isGuestMode) {
        conversation = {
          id: conversationId,
          userId: 0,
          title: 'Guest conversation',
          createdAt: new Date(),
          isGuest: true
        };
      } else {
        // Get the conversation for registered users
        conversation = await storage.getConversation(conversationId);

        if (!conversation) {
          return res.status(404).json({ message: "Conversation not found" });
        }

        if (conversation.userId !== userId) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      // Define messages for guest mode or store them for registered users
      let userMessage;
      let conversationHistory;

      if (isGuestMode) {
        // For guest users, create mock messages without storing in the database
        userMessage = {
          id: Date.now(),
          conversationId,
          content: message, 
          role: "user",
          createdAt: new Date()
        };

        // For guest users, we have no history, just the current message
        conversationHistory = [userMessage];
      } else {
        // For registered users, store the message in the database
        userMessage = await storage.createMessage({
          conversationId,
          content: message,
          role: "user",
        });

        // Get conversation history for context
        conversationHistory = await storage.getMessagesByConversationId(conversationId);
      }

      // Get user's API key or use default
      const apiKeys = isGuestMode ? null : await storage.getApiKeysByUserId(userId);

      // For guest mode, we'll always try to use the environment variable
      let togetherApiKey;

      if (isGuestMode) {
        // For guest users, only use the environment variable
        togetherApiKey = process.env.TOGETHER_AI_API_KEY || "";

        // If no key is available, provide a friendly message
        if (!togetherApiKey) {
          return res.status(400).json({ 
            message: "No API key available for guest users. Please log in and add your own API key in settings."
          });
        }
      } else {
        // For registered users, use their key or fallback to environment variable
        togetherApiKey = apiKeys?.togetherApiKey || process.env.TOGETHER_AI_API_KEY || "";

        if (!togetherApiKey) {
          return res.status(400).json({ 
            message: "No Together AI API key found. Please add an API key in settings."
          });
        }
      }

      // Format conversation history for the AI model
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Get user memory if it exists (for registered users)
      let userMemory = null;
      if (!isGuestMode && userId) {
        const user = await storage.getUser(userId);
        userMemory = user?.memory || null;
      }

      // Build system message with memory context if available
      let systemMessage = {
        role: "system",
        content: "You are Help.ai, a helpful AI assistant powered by Nous-Hermes-2-Mixtral-8x7B-DPO. You can assist with coding, answer questions, help with tasks, and provide accurate information. When generating code, include copy and download options. Always base your answers on accurate information and help the user to the best of your abilities."
      };
      
      // Add memory context to system message if available
      if (userMemory) {
        systemMessage.content += `\n\nHere is some context from previous conversations with this user: ${JSON.stringify(userMemory)}`;
      }

      // Get Stability API key from environment variables
      const stabilityApiKey = process.env.STABILITY_API_KEY;

      // Call the Together AI API
      const response = await fetch("https://api.together.xyz/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${togetherApiKey}`
        },
        body: JSON.stringify({
          model: "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO",
          messages: [
            systemMessage,
            ...formattedHistory
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Together AI API error:", errorData);
        return res.status(500).json({ message: "Failed to get response from AI model" });
      }

      const data = await response.json() as any;

      // Extract the AI's response
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        console.error("Invalid response format from Together AI:", data);
        return res.status(500).json({ message: "Invalid response format from AI model" });
      }

      // Handle different message storage for guest vs registered users
      let assistantMessage;

      if (isGuestMode) {
        // For guest users, create mock message without storing in database
        assistantMessage = {
          id: Date.now() + 1,
          conversationId,
          content: aiResponse,
          role: "assistant",
          createdAt: new Date()
        };
      } else {
        // For registered users, store the assistant message in the database
        assistantMessage = await storage.createMessage({
          conversationId,
          content: aiResponse,
          role: "assistant",
        });
      }

      // For registered users, update memory with context from this conversation
      if (!isGuestMode && userId) {
        try {
          const user = await storage.getUser(userId);
          if (user) {
            // Initialize memory if it doesn't exist
            let memory: any = user.memory || {};
            if (!memory) memory = {};
            if (!Array.isArray(memory.conversations)) memory.conversations = [];
            
            // Create a basic summary of this conversation
            const currentContext = {
              lastInteraction: new Date().toISOString(),
              topic: message.substring(0, 100), // Use start of message as topic indicator
              response: aiResponse.substring(0, 200), // Brief summary of the response
            };
            
            // Add to or update memory
            memory.conversations = [...memory.conversations, currentContext].slice(-10); // Keep last 10 interactions
            
            // Update user's memory
            await storage.updateUser(userId, { memory });
          }
        } catch (error) {
          console.error("Failed to update user memory:", error);
          // Continue without memory update if it fails
        }
      }
      
      // Return both messages
      res.json({
        userMessage,
        assistantMessage
      });
    } catch (error) {
      console.error("Chat API error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/conversations", async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const conversations = await storage.getConversationsByUserId(req.user.id);
    res.json(conversations);
  });
}