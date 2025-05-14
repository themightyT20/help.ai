import { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertMessageSchema } from "@shared/schema";
import { isAuthenticated } from "../middleware/auth";
import fetch from "node-fetch";

// Function to detect if a message is requesting web search information
function detectWebSearchIntent(message: string): boolean {
  const message_lower = message.toLowerCase();

  // Look for web search intent patterns
  const searchPatterns = [
    /search (?:for|about|on) .+/i,
    /find .+ (?:on|about|in) .+/i,
    /look up .+/i,
    /what is .+/i,
    /who is .+/i,
    /where is .+/i,
    /when (?:did|was|is) .+/i,
    /google .+/i,
    /search .+/i,
    /information about .+/i,
    /latest news (?:on|about) .+/i,
    /current .+/i,
    /recent .+/i,
    /find articles (?:on|about) .+/i,
    /^can you (search|find|lookup|get) .+/i
  ];

  // Check if any pattern matches the message
  return searchPatterns.some(pattern => pattern.test(message));
}

// Function to format web search results into a readable summary
function formatWebSearchResults(results: any): string {
  let formattedText = '';

  // Add abstract if available (from answer box or knowledge graph)
  if (results.abstract) {
    formattedText += `Main result: ${results.abstract}\n`;
    if (results.abstractSource) {
      formattedText += `Source: ${results.abstractSource} (${results.abstractURL || 'No URL provided'})\n\n`;
    }
  }

  // Add organic search results
  if (results.results && results.results.length > 0) {
    formattedText += 'Search Results:\n';

    // Only include up to 5 results to keep response size manageable
    const resultsToInclude = results.results.slice(0, 5);

    resultsToInclude.forEach((result: any, index: number) => {
      formattedText += `${index + 1}. ${result.title || 'Untitled'}\n`;
      if (result.snippet) {
        formattedText += `   ${result.snippet}\n`;
      }
      if (result.domain) {
        formattedText += `   Source: ${result.domain}\n`;
      }
      if (result.link) {
        formattedText += `   URL: ${result.link}\n`;
      }
      formattedText += '\n';
    });
  }

  return formattedText;
}

const messageRequestSchema = z.object({
  message: z.string(),
  conversationId: z.number(),
});

export function initChatRoutes(app: Express) {
  // Send a message to the AI assistant
  app.post("/api/chat", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { message, conversationId } = messageRequestSchema.parse(req.body);

      // Detect if this message is requesting web search information
      const shouldPerformWebSearch = detectWebSearchIntent(message);

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
      // Limit the history to prevent "Request entity too large" errors
      // Only take the last 10 messages to keep the request size manageable
      const formattedHistory = conversationHistory
        .slice(-10) // Take only the last 10 messages
        .map(msg => ({
          role: msg.role,
          // Truncate very long message content to prevent oversized requests
          content: msg.content.length > 8000 ? 
            msg.content.substring(0, 8000) + "... [content truncated due to length]" : 
            msg.content
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
        // Format memory in a more concise way to avoid large payloads
        let memoryString = "";

        // Make sure userMemory is properly formatted
        const userMemoryObj = typeof userMemory === 'string' 
          ? JSON.parse(userMemory) 
          : (userMemory || {});

        if (userMemoryObj.conversations && Array.isArray(userMemoryObj.conversations) && userMemoryObj.conversations.length > 0) {
          memoryString = userMemoryObj.conversations
            .slice(-5) // Only include the 5 most recent memory items
            .map((conv: any) => `- Topic: ${conv.topic || 'Unknown'}, Response: ${conv.response || 'No response'}`)
            .join("\n");
        }

        // Only add memory if we actually have something to add
        if (memoryString) {
          systemMessage.content += `\n\nHere is some context from previous conversations with this user:\n${memoryString}`;
        }
      }

      // Perform web search if needed
      let webSearchResults = null;
      if (shouldPerformWebSearch) {
        try {
          console.log(`Detected web search intent in message: "${message}"`);

          // Call the search endpoint
          const searchResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/search`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Replit-User-Id": req.headers["x-replit-user-id"] as string,
              "X-Replit-User-Name": req.headers["x-replit-user-name"] as string,
              "X-Replit-User-Roles": req.headers["x-replit-user-roles"] as string,
              "Authorization": "Internal-API-Call",
              "User-ID": userId?.toString() || "0",
              ...(isGuestMode ? { "x-guest-mode": "true" } : {})
            },
            body: JSON.stringify({ query: message })
          });

          if (searchResponse.ok) {
            webSearchResults = await searchResponse.json();
            console.log("Web search successful");
          } else {
            console.error("Web search failed:", await searchResponse.text());
          }
        } catch (error) {
          console.error("Error performing web search:", error);
          // Continue even if web search fails
        }
      }

      // Get API keys from environment or user config
      const stabilityApiKey = process.env.STABILITY_API_KEY;
      // Note: togetherApiKey is already defined above

      // If we have web search results, add them to the system message
      if (webSearchResults) {
        const webInfo = formatWebSearchResults(webSearchResults);
        systemMessage.content += `\n\nI've searched the web for "${message}" and found this information:\n${webInfo}\n\nUse the above information to help answer the user's question. Be sure to cite sources when appropriate.`;
      }

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
            // Initialize memory object
            let memoryObj: { conversations: Array<{
              lastInteraction: string;
              topic: string;
              response: string;
            }> } = { conversations: [] };

            // Parse existing memory if it exists
            if (user.memory) {
              try {
                const existingMemory = typeof user.memory === 'string' 
                  ? JSON.parse(user.memory)
                  : user.memory;

                if (existingMemory && typeof existingMemory === 'object') {
                  memoryObj = existingMemory;

                  // Ensure conversations array exists
                  if (!Array.isArray(memoryObj.conversations)) {
                    memoryObj.conversations = [];
                  }
                }
              } catch (parseError) {
                console.error("Error parsing user memory:", parseError);
                // Continue with fresh memory object
                memoryObj = { conversations: [] };
              }
            }

            // Create a basic summary of this conversation
            const currentContext = {
              lastInteraction: new Date().toISOString(),
              topic: message.substring(0, 100), // Use start of message as topic indicator
              response: aiResponse.substring(0, 200), // Brief summary of the response
            };

            // Add to or update memory and keep last 10 interactions
            memoryObj.conversations = [
              ...memoryObj.conversations, 
              currentContext
            ].slice(-10);

            // Update user's memory
            await storage.updateUser(userId, { memory: memoryObj });
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