import { Express, Request, Response } from "express";
import passport from "passport";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";

export function initAuthRoutes(app: Express) {
  // Google OAuth routes
  app.get(
    "/api/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/login",
    })
  );
  
  // Discord OAuth routes
  app.get(
    "/api/auth/discord",
    passport.authenticate("discord")
  );
  
  app.get(
    "/api/auth/discord/callback",
    passport.authenticate("discord", {
      successRedirect: "/",
      failureRedirect: "/login",
    })
  );
  
  // Local authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password } = req.body;
      
      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(username);
      const existingUserByEmail = await storage.getUserByEmail(email);
      
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Create the user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        provider: "local",
      });
      
      // Automatically log the user in
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({ message: "Error logging in after registration" });
        }
        return res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  app.post("/api/auth/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      
      if (!user) {
        return res.status(401).json({ message: info.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        return res.json({ id: user.id, username: user.username, email: user.email });
      });
    })(req, res, next);
  });
  
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Error logging out" });
      }
      
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
}
