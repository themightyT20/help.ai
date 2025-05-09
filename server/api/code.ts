import { Express, Request, Response } from "express";
import { z } from "zod";
import { isAuthenticated } from "../middleware/auth";
import { nanoid } from "nanoid";
import path from "path";
import fs from "fs/promises";

const codeRequestSchema = z.object({
  code: z.string(),
  language: z.string(),
  filename: z.string().optional(),
});

export function initCodeRoutes(app: Express) {
  // Create temporary downloads directory if it doesn't exist
  const downloadsDir = path.join(process.cwd(), "dist", "public", "downloads");
  
  // Ensure the downloads directory exists
  (async () => {
    try {
      await fs.mkdir(downloadsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create downloads directory:", error);
    }
  })();
  
  app.post("/api/code/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { code, language, filename = "code" } = codeRequestSchema.parse(req.body);
      
      // Generate a unique ID for the file
      const fileId = nanoid(10);
      
      // Determine file extension based on language
      let fileExtension = ".txt";
      switch (language.toLowerCase()) {
        case "javascript":
          fileExtension = ".js";
          break;
        case "typescript":
          fileExtension = ".ts";
          break;
        case "python":
          fileExtension = ".py";
          break;
        case "java":
          fileExtension = ".java";
          break;
        case "c":
          fileExtension = ".c";
          break;
        case "cpp":
        case "c++":
          fileExtension = ".cpp";
          break;
        case "csharp":
        case "c#":
          fileExtension = ".cs";
          break;
        case "php":
          fileExtension = ".php";
          break;
        case "ruby":
          fileExtension = ".rb";
          break;
        case "go":
          fileExtension = ".go";
          break;
        case "rust":
          fileExtension = ".rs";
          break;
        case "html":
          fileExtension = ".html";
          break;
        case "css":
          fileExtension = ".css";
          break;
        case "json":
          fileExtension = ".json";
          break;
        case "xml":
          fileExtension = ".xml";
          break;
        case "markdown":
        case "md":
          fileExtension = ".md";
          break;
        case "sql":
          fileExtension = ".sql";
          break;
        default:
          fileExtension = ".txt";
      }
      
      // Sanitize the filename
      const sanitizedFilename = filename
        .replace(/[^\w\d-_.]/g, "_")
        .replace(/_{2,}/g, "_");
      
      // Create the complete filename
      const completeFilename = `${sanitizedFilename}_${fileId}${fileExtension}`;
      
      // Create the file path
      const filePath = path.join(downloadsDir, completeFilename);
      
      // Write the code to the file
      await fs.writeFile(filePath, code, "utf-8");
      
      // Return the download URL
      const downloadUrl = `/downloads/${completeFilename}`;
      
      res.json({
        success: true,
        downloadUrl,
        filename: completeFilename
      });
    } catch (error) {
      console.error("Code download API error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid code data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create code download" });
    }
  });
}
