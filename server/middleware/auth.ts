import { Request, Response, NextFunction } from "express";

export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check for guest-mode in headers
  const isGuestMode = req.headers['x-guest-mode'] === 'true';
  
  if (req.isAuthenticated() || isGuestMode) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
}
