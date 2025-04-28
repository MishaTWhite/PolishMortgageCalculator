import { pgTable, text, serial, integer, boolean, jsonb, date, decimal } from "drizzle-orm/pg-core";
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

// Define inflation data schema
export const inflationRates = pgTable("inflation_rates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g., "NBP", "GUS"
  date: text("date").notNull(), // Date of the inflation measurement
  annualRate: text("annual_rate").notNull(), // Annual inflation rate as string
  monthlyRate: text("monthly_rate"), // Monthly inflation rate if available
  fetchDate: text("fetch_date").notNull(), // Date when data was fetched
});

export const insertInflationRateSchema = createInsertSchema(inflationRates).pick({
  source: true,
  date: true,
  annualRate: true,
  monthlyRate: true,
  fetchDate: true,
});

export type InsertInflationRate = z.infer<typeof insertInflationRateSchema>;
export type InflationRate = typeof inflationRates.$inferSelect;

export const inflationRateResponseSchema = z.object({
  source: z.string(),
  current: z.number(),
  historical: z.array(z.object({
    date: z.string(),
    annualRate: z.number(),
    monthlyRate: z.number().optional(),
  })),
  fetchDate: z.string(),
});

export type InflationRateResponse = z.infer<typeof inflationRateResponseSchema>;

// Define stock market index data schema
export const stockIndices = pgTable("stock_indices", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), // e.g., "Yahoo Finance", "Alpha Vantage"
  symbol: text("symbol").notNull(), // e.g., "^GSPC" for S&P 500
  name: text("name").notNull(), // e.g., "S&P 500"
  closingPrice: text("closing_price").notNull(),
  annualReturn: text("annual_return").notNull(), // 1-year return
  fiveYearReturn: text("five_year_return"), // 5-year return if available
  tenYearReturn: text("ten_year_return"), // 10-year return if available
  withDividends: boolean("with_dividends").notNull(), // Whether returns include dividends
  fetchDate: text("fetch_date").notNull(), // Date when data was fetched
});

export const insertStockIndexSchema = createInsertSchema(stockIndices).pick({
  source: true,
  symbol: true,
  name: true,
  closingPrice: true,
  annualReturn: true,
  fiveYearReturn: true,
  tenYearReturn: true,
  withDividends: true,
  fetchDate: true,
});

export type InsertStockIndex = z.infer<typeof insertStockIndexSchema>;
export type StockIndex = typeof stockIndices.$inferSelect;

export const stockIndexResponseSchema = z.object({
  source: z.string(),
  symbol: z.string(),
  name: z.string(),
  closingPrice: z.number(),
  annualReturn: z.number(),
  fiveYearReturn: z.number().optional(),
  tenYearReturn: z.number().optional(),
  withDividends: z.boolean(),
  fetchDate: z.string(),
});

export type StockIndexResponse = z.infer<typeof stockIndexResponseSchema>;

// Define WIBOR rates schema
export const wiborRates = pgTable("wibor_rates", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(), 
  type: text("type").notNull(), // e.g., "1M", "3M", "6M"
  rate: text("rate").notNull(),
  fetchDate: text("fetch_date").notNull(), 
});

export const insertWiborRateSchema = createInsertSchema(wiborRates).pick({
  source: true,
  type: true,
  rate: true,
  fetchDate: true,
});

export type InsertWiborRate = z.infer<typeof insertWiborRateSchema>;
export type WiborRate = typeof wiborRates.$inferSelect;

export const wiborRateResponseSchema = z.object({
  source: z.string(),
  rates: z.record(z.string(), z.number()),
  fetchDate: z.string(),
});

export type WiborRateResponse = z.infer<typeof wiborRateResponseSchema>;

// Define bank mortgage offers schema
export const bankOffers = pgTable("bank_offers", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  bankName: text("bank_name").notNull(),
  bankMargin: text("bank_margin").notNull(),
  wiborType: text("wibor_type").notNull(), // e.g., "3M", "6M"
  totalRate: text("total_rate").notNull(),
  additionalInfo: text("additional_info"),
  fetchDate: text("fetch_date").notNull(),
});

export const insertBankOfferSchema = createInsertSchema(bankOffers).pick({
  source: true,
  bankName: true,
  bankMargin: true,
  wiborType: true,
  totalRate: true,
  additionalInfo: true,
  fetchDate: true,
});

export type InsertBankOffer = z.infer<typeof insertBankOfferSchema>;
export type BankOffer = typeof bankOffers.$inferSelect;

export const bankOfferResponseSchema = z.object({
  source: z.string(),
  offers: z.array(z.object({
    bankName: z.string(),
    bankMargin: z.number(),
    wiborType: z.string(),
    totalRate: z.number(),
    additionalInfo: z.string().optional(),
  })),
  fetchDate: z.string(),
});

export type BankOfferResponse = z.infer<typeof bankOfferResponseSchema>;

// Property market analysis
export const propertyPrices = pgTable("property_prices", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  district: text("district").notNull(),
  averagePricePerSqm: integer("average_price_per_sqm").notNull(),
  numberOfListings: integer("number_of_listings").notNull(),
  minPrice: integer("min_price").notNull(),
  maxPrice: integer("max_price").notNull(),
  // Room breakdown data
  oneRoomCount: integer("one_room_count").default(0),
  oneRoomReportedCount: integer("one_room_reported_count").default(0),
  oneRoomAvgPrice: integer("one_room_avg_price").default(0),
  twoRoomCount: integer("two_room_count").default(0),
  twoRoomReportedCount: integer("two_room_reported_count").default(0),
  twoRoomAvgPrice: integer("two_room_avg_price").default(0),
  threeRoomCount: integer("three_room_count").default(0),
  threeRoomReportedCount: integer("three_room_reported_count").default(0),
  threeRoomAvgPrice: integer("three_room_avg_price").default(0),
  fourPlusRoomCount: integer("four_plus_room_count").default(0),
  fourPlusRoomReportedCount: integer("four_plus_room_reported_count").default(0),
  fourPlusRoomAvgPrice: integer("four_plus_room_avg_price").default(0),
  fetchDate: text("fetch_date").notNull(),
  source: text("source").notNull(),
});

export const insertPropertyPriceSchema = createInsertSchema(propertyPrices).pick({
  city: true,
  district: true,
  averagePricePerSqm: true,
  numberOfListings: true,
  minPrice: true,
  maxPrice: true,
  oneRoomCount: true,
  oneRoomReportedCount: true,
  oneRoomAvgPrice: true,
  twoRoomCount: true,
  twoRoomReportedCount: true,
  twoRoomAvgPrice: true,
  threeRoomCount: true,
  threeRoomReportedCount: true,
  threeRoomAvgPrice: true,
  fourPlusRoomCount: true,
  fourPlusRoomReportedCount: true,
  fourPlusRoomAvgPrice: true,
  fetchDate: true,
  source: true,
});

export type InsertPropertyPrice = z.infer<typeof insertPropertyPriceSchema>;
export type PropertyPrice = typeof propertyPrices.$inferSelect;

export const propertyPriceResponseSchema = z.object({
  city: z.string(),
  prices: z.array(z.object({
    district: z.string(),
    averagePricePerSqm: z.number(),
    numberOfListings: z.number(),
    minPrice: z.number(),
    maxPrice: z.number(),
    roomBreakdown: z.object({
      oneRoom: z.object({
        count: z.number(),
        reportedCount: z.number().optional(),
        avgPrice: z.number(),
      }),
      twoRoom: z.object({
        count: z.number(),
        reportedCount: z.number().optional(),
        avgPrice: z.number(),
      }),
      threeRoom: z.object({
        count: z.number(),
        reportedCount: z.number().optional(),
        avgPrice: z.number(),
      }),
      fourPlusRoom: z.object({
        count: z.number(),
        reportedCount: z.number().optional(),
        avgPrice: z.number(),
      }),
    }).optional(),
  })),
  lastUpdated: z.string(),
  source: z.string(),
});

export type PropertyPriceResponse = z.infer<typeof propertyPriceResponseSchema>;
