import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFileSubmissionSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('지원하지 않는 파일 형식입니다.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all file submissions with optional category filter
  app.get("/api/submissions", async (req, res) => {
    try {
      const hospital = req.query.hospital as string;
      const submissions = await storage.getFileSubmissions(hospital);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions:", error);
      res.status(500).json({ message: "제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Get single file submission
  app.get("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getFileSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error fetching submission:", error);
      res.status(500).json({ message: "제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Create new file submission
  app.post("/api/submissions", upload.single('file'), async (req, res) => {
    try {
      const validatedData = insertFileSubmissionSchema.parse(req.body);
      
      // Add file information if file was uploaded
      if (req.file) {
        validatedData.fileName = req.file.originalname;
        validatedData.filePath = req.file.path;
        validatedData.fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
      }
      
      const submission = await storage.createFileSubmission(validatedData);
      
      // TODO: Integrate with Synology NAS API to store file
      // TODO: Trigger GitHub deployment webhook
      
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "입력 데이터가 올바르지 않습니다.",
          errors: error.errors 
        });
      }
      
      console.error("Error creating submission:", error);
      res.status(500).json({ message: "제출물 생성 중 오류가 발생했습니다." });
    }
  });

  // Update file submission
  app.patch("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const submission = await storage.updateFileSubmission(id, updates);
      
      if (!submission) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      
      res.json(submission);
    } catch (error) {
      console.error("Error updating submission:", error);
      res.status(500).json({ message: "제출물 업데이트 중 오류가 발생했습니다." });
    }
  });

  // Delete file submission
  app.delete("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getFileSubmission(id);
      
      if (!submission) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      
      // Delete file from filesystem if it exists
      if (submission.filePath && fs.existsSync(submission.filePath)) {
        fs.unlinkSync(submission.filePath);
      }
      
      const deleted = await storage.deleteFileSubmission(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      
      res.json({ message: "제출물이 삭제되었습니다." });
    } catch (error) {
      console.error("Error deleting submission:", error);
      res.status(500).json({ message: "제출물 삭제 중 오류가 발생했습니다." });
    }
  });

  // Get submissions by hospital
  app.get("/api/submissions/hospital/:hospital", async (req, res) => {
    try {
      const { hospital } = req.params;
      const submissions = await storage.getFileSubmissionsByHospital(hospital);
      res.json(submissions);
    } catch (error) {
      console.error("Error fetching submissions by hospital:", error);
      res.status(500).json({ message: "병원별 제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "온라인", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
