import express from "express";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { createServer } from "http";
import { storage } from "./storage"; // storage 모듈 가정
import { insertFileSubmissionSchema } from "@shared/schema"; // 스키마 모듈 가정
import SynologyAPI from "./synology-api.js";

// SynologyAPI 클래스
class SynologyAPI {
  constructor() {
    this.host = process.env.SYNOLOGY_HOST;
    this.port = process.env.SYNOLOGY_PORT;
    this.username = process.env.SYNOLOGY_USERNAME;
    this.password = process.env.SYNOLOGY_PASSWORD;
    this.sessionId = null;
    this.baseUrl = `https://${this.host}:${this.port}`;
  }

  async login() {
    try {
      const response = await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: "SYNO.API.Auth",
          version: "3",
          method: "login",
          account: this.username,
          passwd: this.password,
          session: "FileStation",
          format: "cookie",
        },
      });
      if (response.data.success) {
        this.sessionId = response.data.data.sid;
        console.log("시놀로지 NAS 로그인 성공");
        return true;
      } else {
        console.error(
          "로그인 실패:",
          JSON.stringify(response.data.error, null, 2),
        );
        return false;
      }
    } catch (error) {
      console.error("로그인 오류:", error.message);
      return false;
    }
  }

  async uploadFile(filePath, destinationFolder = "/선납파일") {
    if (!this.sessionId && !(await this.login())) {
      console.error("로그인 실패로 업로드 중단");
      return false;
    }
    try {
      if (!fs.existsSync(filePath)) {
        console.error("파일을 찾을 수 없습니다:", filePath);
        return false;
      }
      const form = new FormData();
      form.append("api", "SYNO.FileStation.Upload");
      form.append("version", "2");
      form.append("method", "upload");
      form.append("path", destinationFolder);
      form.append("create_parents", "true");
      form.append("overwrite", "true");
      form.append("file", fs.createReadStream(filePath));

      const response = await axios.post(
        `${this.baseUrl}/webapi/entry.cgi?_sid=${this.sessionId}`,
        form,
        { headers: form.getHeaders(), timeout: 60000 },
      );
      if (response.data.success) {
        console.log("파일 업로드 성공:", filePath);
        return true;
      } else {
        console.error(
          "업로드 실패:",
          JSON.stringify(response.data.error, null, 2),
        );
        return false;
      }
    } catch (error) {
      console.error("업로드 오류:", error.message);
      return false;
    }
  }

  async logout() {
    if (!this.sessionId) return;
    try {
      await axios.get(`${this.baseUrl}/webapi/auth.cgi`, {
        params: {
          api: "SYNO.API.Auth",
          version: "3",
          method: "logout",
          session: "FileStation",
        },
      });
      this.sessionId = null;
      console.log("시놀로지 NAS 로그아웃 완료");
    } catch (error) {
      console.error("로그아웃 오류:", error.message);
    }
  }
}

// 시놀로지 API 인스턴스 생성
const synologyAPI = new SynologyAPI(
  process.env.SYNOLOGY_HOST || "localhost",
  process.env.SYNOLOGY_PORT || "5000",
  process.env.SYNOLOGY_USERNAME || "",
  process.env.SYNOLOGY_PASSWORD || "",
);

// Multer 설정
const uploadDir = path.join(process.cwd(), "Uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
      );
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB 제한
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("지원하지 않는 파일 형식입니다."));
    }
  },
});

// Express 앱 설정
const app = express();
app.use(express.json());

// 라우트 등록
async function registerRoutes(app) {
  // 모든 제출물 조회 (병원 필터 가능)
  app.get("/api/submissions", async (req, res) => {
    try {
      const hospital = req.query.hospital;
      const submissions = await storage.getFileSubmissions(hospital);
      res.json(submissions);
    } catch (error) {
      console.error("제출물 조회 오류:", error.message);
      res
        .status(500)
        .json({ message: "제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 단일 제출물 조회
  app.get("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getFileSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      res.json(submission);
    } catch (error) {
      console.error("제출물 조회 오류:", error.message);
      res
        .status(500)
        .json({ message: "제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 새 제출물 생성 (파일 업로드 및 Synology NAS 저장)
  app.post("/api/submissions", upload.single("file"), async (req, res) => {
    try {
      const validatedData = insertFileSubmissionSchema.parse(req.body);

      // Add file information if file was uploaded
      if (req.file) {
        validatedData.fileName = req.file.originalname;
        validatedData.filePath = req.file.path;
        validatedData.fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;

        // 시놀로지 NAS에 파일 업로드
        try {
          const uploadSuccess = await synologyAPI.uploadFile(
            req.file.path,
            process.env.SYNOLOGY_UPLOAD_PATH || "/선납파일",
          );

          if (uploadSuccess) {
            console.log(
              `파일이 시놀로지 NAS에 성공적으로 업로드되었습니다: ${req.file.originalname}`,
            );
            // NAS 업로드 성공 시 로컬 파일 삭제
            if (fs.existsSync(req.file.path)) {
              fs.unlinkSync(req.file.path);
            }
          } else {
            console.warn("시놀로지 업로드 실패, 로컬 파일만 저장됨");
          }
        } catch (synologyError) {
          console.error("시놀로지 업로드 중 오류:", synologyError.message);
          // 시놀로지 업로드 실패해도 로컬 저장은 계속 진행
        }
      }

      const submission = await storage.createFileSubmission(validatedData);

      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "입력 데이터가 올바르지 않습니다.",
          errors: error.errors,
        });
      }

      console.error("제출물 생성 오류:", error.message);
      res.status(500).json({ message: "제출물 생성 중 오류가 발생했습니다." });
    }
  });

  // 제출물 업데이트
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
      console.error("제출물 업데이트 오류:", error.message);
      res
        .status(500)
        .json({ message: "제출물 업데이트 중 오류가 발생했습니다." });
    }
  });

  // 제출물 삭제
  app.delete("/api/submissions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const submission = await storage.getFileSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      if (submission.filePath && fs.existsSync(submission.filePath)) {
        fs.unlinkSync(submission.filePath);
      }
      const deleted = await storage.deleteFileSubmission(id);
      if (!deleted) {
        return res.status(404).json({ message: "제출물을 찾을 수 없습니다." });
      }
      res.json({ message: "제출물이 삭제되었습니다." });
    } catch (error) {
      console.error("제출물 삭제 오류:", error.message);
      res.status(500).json({ message: "제출물 삭제 중 오류가 발생했습니다." });
    }
  });

  // 병원별 제출물 조회
  app.get("/api/submissions/hospital/:hospital", async (req, res) => {
    try {
      const { hospital } = req.params;
      const submissions = await storage.getFileSubmissionsByHospital(hospital);
      res.json(submissions);
    } catch (error) {
      console.error("병원별 제출물 조회 오류:", error.message);
      res
        .status(500)
        .json({ message: "병원별 제출물을 가져오는 중 오류가 발생했습니다." });
    }
  });

  // 시놀로지 NAS 연결 상태 확인
  app.get("/api/synology/status", async (req, res) => {
    try {
      const loginSuccess = await synologyAPI.login();
      if (loginSuccess) {
        await synologyAPI.logout();
        res.json({ status: "connected", message: "시놀로지 NAS 연결 정상" });
      } else {
        res
          .status(503)
          .json({ status: "disconnected", message: "시놀로지 NAS 연결 실패" });
      }
    } catch (error) {
      console.error("시놀로지 상태 확인 오류:", error.message);
      res
        .status(503)
        .json({ status: "error", message: "연결 상태 확인 중 오류 발생" });
    }
  });

  // 헬스 체크 엔드포인트
  app.get("/api/health", (req, res) => {
    res.json({ status: "온라인", timestamp: new Date().toISOString() });
  });

  return createServer(app);
}

// 서버 시작
async function main() {
  const app = express();
  const server = await registerRoutes(app);
  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
  });
}

main().catch((error) => console.error("서버 시작 오류:", error.message));
