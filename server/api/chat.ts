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
      const userId = (req.user as any).id;
      
      // Get the conversation
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (conversation.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Store the user's message
      const userMessage = await storage.createMessage({
        conversationId,
        content: message,
        role: "user",
      });
      
      // Get user's API key
      const apiKeys = await storage.getApiKeysByUserId(userId);
      
      // Use user's API key or fallback to environment variable
      const togetherApiKey = apiKeys?.togetherApiKey || 
                            process.env.TOGETHER_AI_API_KEY || 
                            "";
      
      if (!togetherApiKey) {
        return res.status(400).json({ 
          message: "No Together AI API key found. Please add an API key in settings."
        });
      }
      
      // Get conversation history for context
      const conversationHistory = await storage.getMessagesByConversationId(conversationId);
      
      // Format conversation history for the AI model
      const formattedHistory = conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
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
            {
              role: "system",
              content: "You are Help.ai, a helpful AI assistant powered by Nous-Hermes-2-Mixtral-8x7B-DPO. You can assist with coding, answer questions, help with tasks, and provide accurate information. When generating code, include copy and download options. Always base your answers on accurate information and help the user to the best of your abilities."
            },
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
      
      const data = await response.json();
      
      // Extract the AI's response
      const aiResponse = data.choices[0].message.content;
      
      // Store the AI's message
      const assistantMessage = await storage.createMessage({
        conversationId,
        content: aiResponse,
        role: "assistant",
      });
      
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
}
