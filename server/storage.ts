import { type User, type InsertUser, type FileSubmission, type InsertFileSubmission } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getFileSubmissions(category?: string): Promise<FileSubmission[]>;
  getFileSubmission(id: string): Promise<FileSubmission | undefined>;
  createFileSubmission(submission: InsertFileSubmission): Promise<FileSubmission>;
  updateFileSubmission(id: string, updates: Partial<FileSubmission>): Promise<FileSubmission | undefined>;
  deleteFileSubmission(id: string): Promise<boolean>;
  getFileSubmissionsByCategory(category: string): Promise<FileSubmission[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private fileSubmissions: Map<string, FileSubmission>;

  constructor() {
    this.users = new Map();
    this.fileSubmissions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getFileSubmissions(category?: string): Promise<FileSubmission[]> {
    const submissions = Array.from(this.fileSubmissions.values());
    if (category && category !== "전체") {
      return submissions.filter(submission => submission.category === category);
    }
    return submissions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFileSubmission(id: string): Promise<FileSubmission | undefined> {
    return this.fileSubmissions.get(id);
  }

  async createFileSubmission(insertSubmission: InsertFileSubmission): Promise<FileSubmission> {
    const id = randomUUID();
    const submission: FileSubmission = {
      ...insertSubmission,
      id,
      createdAt: new Date(),
    };
    this.fileSubmissions.set(id, submission);
    return submission;
  }

  async updateFileSubmission(id: string, updates: Partial<FileSubmission>): Promise<FileSubmission | undefined> {
    const existing = this.fileSubmissions.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.fileSubmissions.set(id, updated);
    return updated;
  }

  async deleteFileSubmission(id: string): Promise<boolean> {
    return this.fileSubmissions.delete(id);
  }

  async getFileSubmissionsByCategory(category: string): Promise<FileSubmission[]> {
    return Array.from(this.fileSubmissions.values())
      .filter(submission => submission.category === category)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const storage = new MemStorage();
