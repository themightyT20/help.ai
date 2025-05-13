import { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/auth";
import { storage } from "../storage";
import fetch from "node-fetch";
import { Buffer } from 'buffer';

const imageGenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  stylePreset: z.string().optional(),
  width: z.number().int().min(512).max(1024).default(512),
  height: z.number().int().min(512).max(1024).default(512),
  conversationId: z.number().optional(),
  samples: z.number().int().min(1).max(4).default(1),
});

export function initImageRoutes(app: Express) {
  // Generate an image with Stability AI
  app.post("/api/image/generate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { 
        prompt, 
        negativePrompt, 
        stylePreset, 
        width, 
        height, 
        samples,
        conversationId
      } = imageGenerationRequestSchema.parse(req.body);

      // Handle guest mode
      const isGuestMode = req.headers['x-guest-mode'] === 'true';
      const userId = isGuestMode ? 0 : (req.user as any).id;

      // Get user's API key or use default from environment
      let stabilityApiKey;

      if (isGuestMode) {
        // For guest users, only use the environment variable
        stabilityApiKey = process.env.STABILITY_API_KEY || "";

        // If no key is available, provide a friendly message
        if (!stabilityApiKey) {
          return res.status(400).json({ 
            message: "No Stability AI API key available for guest users. Please log in and add your own API key in settings."
          });
        }
      } else {
        // For registered users, use their key or fallback to environment variable
        const apiKeys = await storage.getApiKeysByUserId(userId);
        stabilityApiKey = apiKeys?.stabilityApiKey || process.env.STABILITY_API_KEY || "";

        if (!stabilityApiKey) {
          return res.status(400).json({ 
            message: "No Stability AI API key found. Please add an API key in settings."
          });
        }
      }

      const apiHost = 'https://api.stability.ai';
      const engineId = 'stable-diffusion-xl-1024-v1-0';

      // Build request to Stability API
      const response = await fetch(
        `${apiHost}/v1/generation/${engineId}/text-to-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${stabilityApiKey}`,
          },
          body: JSON.stringify({
            text_prompts: [
              {
                text: prompt,
                weight: 1.0,
              },
              ...(negativePrompt ? [{ text: negativePrompt, weight: -1.0 }] : []),
            ],
            cfg_scale: 7,
            height: height,
            width: width,
            samples: samples,
            steps: 30,
            ...(stylePreset ? { style_preset: stylePreset } : {}),
          }),
        }
      );

      if (!response.ok) {
        console.error(`Stability AI API error: ${response.status} ${response.statusText}`);
        // Try to get more detailed error info
        try {
          const errorData = await response.json();
          console.error('Error details:', errorData);
          
          // Return appropriate message based on status code
          if (response.status === 401) {
            return res.status(401).json({ message: 'Invalid Stability API key. Please check your API key in settings.' });
          } else if (response.status === 403) {
            return res.status(403).json({ message: 'Your Stability API key does not have permission to access this resource.' });
          } else if (response.status === 429) {
            return res.status(429).json({ message: 'You have reached your Stability API rate limit. Please try again later.' });
          }
          
          return res.status(response.status).json({ 
            message: 'Failed to generate image', 
            details: errorData 
          });
        } catch (e) {
          // If we can't parse the error as JSON, return the status text
          return res.status(response.status).json({ 
            message: `Failed to generate image: ${response.statusText}` 
          });
        }
      }

      const data: any = await response.json();
      
      // Process the images and create base64 URLs
      const generatedImages = data.artifacts.map((image: any) => {
        const base64Data = image.base64;
        const imageUrl = `data:image/png;base64,${base64Data}`;
        
        return {
          imageUrl,
          seed: image.seed,
          finishReason: image.finish_reason
        };
      });

      // If this is part of a conversation and we have a conversationId, save it as a message
      if (conversationId && !isGuestMode) {
        try {
          // Create user message with the prompt
          await storage.createMessage({
            conversationId,
            content: `Generated image with prompt: "${prompt}"`,
            role: "user",
          });
          
          // Create assistant message with the image URLs
          await storage.createMessage({
            conversationId,
            content: `I've generated ${generatedImages.length} ${generatedImages.length > 1 ? 'images' : 'image'} based on your prompt. ${generatedImages.map((img, i) => `\n\n![Image ${i+1}](${img.imageUrl})`).join('')}`,
            role: "assistant",
            metadata: {
              imageGeneration: {
                prompt,
                images: generatedImages.map(img => ({
                  seed: img.seed,
                  finishReason: img.finishReason
                }))
              }
            }
          });
        } catch (error) {
          console.error("Failed to save image generation to conversation:", error);
          // Continue even if saving to conversation fails
        }
      }

      // Return the generated images
      res.json({
        images: generatedImages,
        prompt,
        width,
        height,
        stylePreset
      });
    } catch (error) {
      console.error("Image generation API error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid image generation parameters", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to generate image" });
    }
  });
}