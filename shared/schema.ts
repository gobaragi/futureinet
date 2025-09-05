import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const fileSubmissions = pgTable("file_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  hospital: text("hospital").notNull(),
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: text("file_size"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFileSubmissionSchema = createInsertSchema(fileSubmissions).omit({
  id: true,
  createdAt: true,
}).extend({
  hospital: z.enum(["안암병원", "구로병원", "안산병원", "기타"], {
    required_error: "병원을 선택해주세요"
  }),
  content: z.string().min(1, "내용을 입력해주세요"),
  status: z.enum(["pending", "completed", "failed"]).default("pending"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertFileSubmission = z.infer<typeof insertFileSubmissionSchema>;
export type FileSubmission = typeof fileSubmissions.$inferSelect;
