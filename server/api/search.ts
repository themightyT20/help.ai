import { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/auth";
import { storage } from "../storage";
import fetch from "node-fetch";

const searchRequestSchema = z.object({
  query: z.string().min(1),
});

export function initSearchRoutes(app: Express) {
  app.post("/api/search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { query } = searchRequestSchema.parse(req.body);
      const userId = req.user ? (req.user as any).id : null;
      
      // Get the API key from the database if the user is logged in
      let seperDevApiKey = process.env.SEPER_DEV_API_KEY || ''; // Default to env variable if available
      
      if (userId) {
        try {
          const userApiKeys = await storage.getApiKeysByUserId(userId);
          if (userApiKeys && userApiKeys.seperDevApiKey) {
            seperDevApiKey = userApiKeys.seperDevApiKey;
          }
        } catch (error) {
          console.error("Error fetching API key:", error);
          // Continue with env variable if available
        }
      }
      
      if (!seperDevApiKey) {
        return res.status(400).json({ 
          message: "Seper.dev API key not found. Please add it in your settings.",
          missingApiKey: true
        });
      }
      
      // Use seper.dev Google Search API
      const apiUrl = `https://google.serper.dev/search`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "X-API-KEY": seperDevApiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          q: query,
          gl: "us", // Google locale (country of search)
          hl: "en"  // Language for search results
        })
      });
      
      if (!response.ok) {
        console.error("Seper.dev search error:", await response.text());
        return res.status(response.status).json({ 
          message: "Failed to get search results from Seper.dev",
          status: response.status
        });
      }
      
      const data = await response.json() as any;
      
      // Process the Google search results
      const organicResults = data.organic || [];
      
      const processedResults = organicResults.map((result: any) => {
        // Extract domain from URL if present
        let domain = '';
        if (result.link) {
          try {
            const url = new URL(result.link);
            domain = url.hostname;
          } catch (e) {
            console.error("Failed to parse URL:", e);
          }
        }
        
        return {
          title: result.title || '',
          snippet: result.snippet || '',
          link: result.link || '',
          domain: domain,
          position: result.position,
          attributes: result.attributes || {}
        };
      });
      
      // Format the search results in a structure compatible with our app
      const searchResults = {
        query,
        abstract: data.answerBox?.answer || data.knowledgeGraph?.description || '',
        abstractText: data.answerBox?.snippet || '',
        abstractSource: data.answerBox?.source?.name || data.knowledgeGraph?.title || '',
        abstractURL: data.answerBox?.source?.link || data.knowledgeGraph?.siteLinks?.[0]?.link || '',
        results: processedResults,
        searchInformation: data.searchInformation || {},
        timestamp: new Date().toISOString()
      };
      
      res.json(searchResults);
    } catch (error) {
      console.error("Search API error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid search query", errors: error.errors });
      }
      // Handle specific error types or return a generic error
      res.status(500).json({ 
        message: "Failed to process search request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}
