import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We keep the users table from the original schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Define interest rate schema
export const interestRates = pgTable("interest_rates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g., "NBP", "ECB"
  rate: text("rate").notNull(), // Store as text to preserve exact string representation
  fetchDate: text("fetch_date").notNull(), // Date when rate was fetched
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertInterestRateSchema = createInsertSchema(interestRates).pick({
  source: true,
  rate: true,
  fetchDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInterestRate = z.infer<typeof insertInterestRateSchema>;
export type InterestRate = typeof interestRates.$inferSelect;

// Define mortgage calculation result schema for API responses
export const mortgageResultSchema = z.object({
  loanAmount: z.number(),
  monthlyPayment: z.number(),
  loanDurationMonths: z.number(),
  totalInterest: z.number(),
  totalRepayment: z.number(),
  interestRate: z.number(),
});

export type MortgageResult = z.infer<typeof mortgageResultSchema>;
