import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as DiscordStrategy } from "passport-discord";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { insertUserSchema, insertMessageSchema, insertConversationSchema } from "@shared/schema";
import MemoryStore from "memorystore";
import dotenv from "dotenv";
import { initAuthRoutes } from "./api/auth";
import { initChatRoutes } from "./api/chat";
import { initSearchRoutes } from "./api/search";
import { initCodeRoutes } from "./api/code";
import { isAuthenticated } from "./middleware/auth";

dotenv.config();

// Initialize session store
const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Session configuration
  app.use(
    session({
      store: new SessionStore({
        checkPeriod: 86400000, // 24 hours
      }),
      secret: process.env.SESSION_SECRET || "help-ai-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
    })
  );
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Serialize & deserialize user
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
  
  // Local Strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          if (!user.password) {
            return done(null, false, { message: "Please use OAuth to log in" });
          }
          
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Incorrect email or password" });
          }
          
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByProvider("google", profile.id);
            
            if (!user) {
              // Create a new user
              user = await storage.createUser({
                username: profile.displayName || `user_${profile.id}`,
                email: profile.emails?.[0]?.value,
                profilePicture: profile.photos?.[0]?.value,
                provider: "google",
                providerId: profile.id,
              });
            }
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  
  // Discord OAuth Strategy
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(
      new DiscordStrategy(
        {
          clientID: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          callbackURL: "/api/auth/discord/callback",
          scope: ["identify", "email"],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            let user = await storage.getUserByProvider("discord", profile.id);
            
            if (!user) {
              // Create a new user
              user = await storage.createUser({
                username: profile.username || `user_${profile.id}`,
                email: profile.email,
                profilePicture: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
                provider: "discord",
                providerId: profile.id,
              });
            }
            
            return done(null, user);
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }
  
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
