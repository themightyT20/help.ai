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
      const searchResults = {
        query,
        abstract: data.Abstract || '',
        abstractText: data.AbstractText || '',
        abstractSource: data.AbstractSource || '',
        abstractURL: data.AbstractURL || '',
        results: data.Results || [],
        relatedTopics: data.RelatedTopics || [],
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
