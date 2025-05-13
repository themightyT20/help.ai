import { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/auth";
import { storage } from "../storage";
import fetch from "node-fetch";

const searchRequestSchema = z.object({
  query: z.string().min(1),
});

export function initSearchRoutes(app: Express) {
  app.post("/api/search", async (req: Request, res: Response) => {
    try {
      const { query } = searchRequestSchema.parse(req.body);
      const userId = (req.user as any).id;
      
      // DuckDuckGo API doesn't require an API key for basic search
      
      // For DuckDuckGo search, we'll use their text search as they don't require an API key
      // We're making a GET request to their instant answer API
      const encodedQuery = encodeURIComponent(query);
      
      const response = await fetch(`https://api.duckduckgo.com/?q=${encodedQuery}&format=json&pretty=1`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        }
      });
      
      if (!response.ok) {
        console.error("DuckDuckGo search error:", await response.text());
        return res.status(500).json({ message: "Failed to get search results" });
      }
      
      const data: any = await response.json();
      
      // Format the search results
      // Process related topics to add website summaries
      const processedTopics = data.RelatedTopics ? data.RelatedTopics.map((topic: any) => {
        // Extract domain from URL if present
        let domain = '';
        let summary = '';
        
        if (topic.FirstURL) {
          try {
            const url = new URL(topic.FirstURL);
            domain = url.hostname;
          } catch (e) {
            // If URL parsing fails, use empty domain
            console.error("Failed to parse URL:", e);
          }
        }
        
        // Create a brief summary from the Text if available
        if (topic.Text) {
          // Try to extract a reasonable summary (first 150 chars or so)
          summary = topic.Text.length > 150 ? 
            topic.Text.substring(0, 150) + '...' : 
            topic.Text;
        }
        
        return {
          ...topic,
          domain: domain,
          summary: summary
        };
      }) : [];
      
      const searchResults = {
        query,
        abstract: data.Abstract || '',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        results: data.Results || [],
        relatedTopics: processedTopics,
        timestamp: new Date().toISOString()
      };
      
      res.json(searchResults);
    } catch (error) {
      console.error("Search API error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid search query", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process search request" });
    }
  });
}
