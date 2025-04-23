import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
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

// Define exchange rates schema
export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g., "exchangerate.host", "NBP"
  base: text("base").notNull(), // Base currency (PLN)
  rates: jsonb("rates").notNull(), // JSON object with currency rates
  fetchDate: text("fetch_date").notNull(), // Date when rates were fetched
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

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).pick({
  source: true,
  base: true,
  rates: true,
  fetchDate: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertInterestRate = z.infer<typeof insertInterestRateSchema>;
export type InterestRate = typeof interestRates.$inferSelect;

export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;

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

// Define exchange rate response schema
export const exchangeRateResponseSchema = z.object({
  source: z.string(),
  base: z.string(),
  rates: z.record(z.string(), z.number()),
  fetchDate: z.string(),
});

export type ExchangeRateResponse = z.infer<typeof exchangeRateResponseSchema>;
