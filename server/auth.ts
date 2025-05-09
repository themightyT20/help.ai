import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as DiscordStrategy } from "passport-discord";
import { Express, Request } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET ?? "help-ai-dev-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      // Setting secure to false for development. In production, this should be true
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !user.password || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  // Google Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: "/api/auth/google/callback",
          scope: ["profile", "email"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists
            let user = await storage.getUserByProvider("google", profile.id);
            
            if (!user) {
              // Create a new user
              const email = profile.emails?.[0]?.value || null;
              const username = `google_${profile.id}`;
              const profilePicture = profile.photos?.[0]?.value || null;
              
              // Check if the email already exists (to link accounts)
              if (email) {
                const emailUser = await storage.getUserByEmail(email);
                if (emailUser) {
                  // Update existing user with Google provider info
                  user = await storage.updateUser(emailUser.id, {
                    provider: "google",
                    providerId: profile.id,
                    profilePicture: profilePicture || emailUser.profilePicture
                  });
                }
              }
              
              // If still no user, create a new one
              if (!user) {
                user = await storage.createUser({
                  username,
                  password: null,
                  email,
                  profilePicture,
                  provider: "google",
                  providerId: profile.id
                });
              }
            }
            
            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }
  
  // Discord Strategy
  if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    passport.use(
      new DiscordStrategy(
        {
          clientID: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          callbackURL: "/api/auth/discord/callback",
          scope: ["identify", "email"]
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user already exists
            let user = await storage.getUserByProvider("discord", profile.id);
            
            if (!user) {
              // Create a new user
              const email = profile.email || null;
              const username = `discord_${profile.id}`;
              const profilePicture = profile.avatar 
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` 
                : null;
              
              // Check if the email already exists (to link accounts)
              if (email) {
                const emailUser = await storage.getUserByEmail(email);
                if (emailUser) {
                  // Update existing user with Discord provider info
                  user = await storage.updateUser(emailUser.id, {
                    provider: "discord",
                    providerId: profile.id,
                    profilePicture: profilePicture || emailUser.profilePicture
                  });
                }
              }
              
              // If still no user, create a new one
              if (!user) {
                user = await storage.createUser({
                  username,
                  password: null,
                  email,
                  profilePicture,
                  provider: "discord",
                  providerId: profile.id
                });
              }
            }
            
            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  passport.serializeUser((user, done) => done(null, user.id));
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists if provided
      if (email) {
        const emailUser = await storage.getUserByEmail(email);
        if (emailUser) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      
      // Create the user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        profilePicture: null,
        provider: null,
        providerId: null
      });

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Authentication failed" });
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    res.json(req.user);
  });

  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google"));
  
  app.get(
    "/api/auth/google/callback",
    passport.authenticate("google", {
      successRedirect: "/",
      failureRedirect: "/auth"
    })
  );

  // Discord OAuth routes
  app.get("/api/auth/discord", passport.authenticate("discord"));
  
  app.get(
    "/api/auth/discord/callback",
    passport.authenticate("discord", {
      successRedirect: "/",
      failureRedirect: "/auth"
    })
  );
}