import { 
  users, type User, type InsertUser,
  interestRates, type InterestRate, type InsertInterestRate,
  exchangeRates, type ExchangeRate, type InsertExchangeRate,
  inflationRates, type InflationRate, type InsertInflationRate,
  stockIndices, type StockIndex, type InsertStockIndex,
  wiborRates, type WiborRate, type InsertWiborRate,
  bankOffers, type BankOffer, type InsertBankOffer,
  propertyPrices, type PropertyPrice, type InsertPropertyPrice
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Interest rate methods
  getLatestInterestRate(): Promise<InterestRate | undefined>;
  createInterestRate(rate: InsertInterestRate): Promise<InterestRate>;
  
  // Exchange rate methods
  getLatestExchangeRate(): Promise<ExchangeRate | undefined>;
  createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate>;
  
  // Inflation rate methods
  getLatestInflationRate(): Promise<InflationRate | undefined>;
  getAllInflationRates(): Promise<InflationRate[]>;
  createInflationRate(rate: InsertInflationRate): Promise<InflationRate>;
  
  // Stock index methods
  getLatestStockIndex(symbol: string): Promise<StockIndex | undefined>;
  createStockIndex(index: InsertStockIndex): Promise<StockIndex>;
  
  // WIBOR rate methods
  getLatestWiborRates(): Promise<WiborRate[]>;
  createWiborRate(rate: InsertWiborRate): Promise<WiborRate>;
  
  // Bank offer methods
  getLatestBankOffers(): Promise<BankOffer[]>;
  createBankOffer(offer: InsertBankOffer): Promise<BankOffer>;
  
  // Property price methods
  getPropertyPricesByCity(city: string): Promise<PropertyPrice[]>;
  createPropertyPrice(price: InsertPropertyPrice): Promise<PropertyPrice>;
  deletePropertyPricesByCity(city: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Interest rate methods
  async getLatestInterestRate(): Promise<InterestRate | undefined> {
    const [rate] = await db.select().from(interestRates).orderBy(desc(interestRates.id)).limit(1);
    return rate || undefined;
  }
  
  async createInterestRate(rate: InsertInterestRate): Promise<InterestRate> {
    const [interestRate] = await db.insert(interestRates).values(rate).returning();
    return interestRate;
  }
  
  // Exchange rate methods
  async getLatestExchangeRate(): Promise<ExchangeRate | undefined> {
    const [rate] = await db.select().from(exchangeRates).orderBy(desc(exchangeRates.id)).limit(1);
    return rate || undefined;
  }
  
  async createExchangeRate(rate: InsertExchangeRate): Promise<ExchangeRate> {
    const [exchangeRate] = await db.insert(exchangeRates).values(rate).returning();
    return exchangeRate;
  }
  
  // Inflation rate methods
  async getLatestInflationRate(): Promise<InflationRate | undefined> {
    const [rate] = await db.select().from(inflationRates).orderBy(desc(inflationRates.id)).limit(1);
    return rate || undefined;
  }
  
  async getAllInflationRates(): Promise<InflationRate[]> {
    return await db.select().from(inflationRates).orderBy(desc(inflationRates.id));
  }
  
  async createInflationRate(rate: InsertInflationRate): Promise<InflationRate> {
    const [inflationRate] = await db.insert(inflationRates).values(rate).returning();
    return inflationRate;
  }
  
  // Stock index methods
  async getLatestStockIndex(symbol: string): Promise<StockIndex | undefined> {
    const [index] = await db
      .select()
      .from(stockIndices)
      .where(eq(stockIndices.symbol, symbol))
      .orderBy(desc(stockIndices.id))
      .limit(1);
    return index || undefined;
  }
  
  async createStockIndex(index: InsertStockIndex): Promise<StockIndex> {
    const [stockIndex] = await db.insert(stockIndices).values(index).returning();
    return stockIndex;
  }
  
  // WIBOR rate methods
  async getLatestWiborRates(): Promise<WiborRate[]> {
    // Get the most recent fetch date
    const [latestRate] = await db
      .select()
      .from(wiborRates)
      .orderBy(desc(wiborRates.id))
      .limit(1);
      
    if (!latestRate) {
      return [];
    }
    
    // Get all rates with the same fetch date
    return await db
      .select()
      .from(wiborRates)
      .where(eq(wiborRates.fetchDate, latestRate.fetchDate));
  }
  
  async createWiborRate(rate: InsertWiborRate): Promise<WiborRate> {
    const [wiborRate] = await db.insert(wiborRates).values(rate).returning();
    return wiborRate;
  }
  
  // Bank offer methods
  async getLatestBankOffers(): Promise<BankOffer[]> {
    // Get the most recent fetch date
    const [latestOffer] = await db
      .select()
      .from(bankOffers)
      .orderBy(desc(bankOffers.id))
      .limit(1);
      
    if (!latestOffer) {
      return [];
    }
    
    // Get all offers with the same fetch date
    return await db
      .select()
      .from(bankOffers)
      .where(eq(bankOffers.fetchDate, latestOffer.fetchDate));
  }
  
  async createBankOffer(offer: InsertBankOffer): Promise<BankOffer> {
    const [bankOffer] = await db.insert(bankOffers).values(offer).returning();
    return bankOffer;
  }
  
  // Property price methods
  async getPropertyPricesByCity(city: string): Promise<PropertyPrice[]> {
    // Get all property prices for the specified city
    // Each city's data will be a group with the same fetch date
    // We need to find the latest fetch date for the specified city
    
    // Normalize city name for case-insensitive search
    const cityLowerCase = city.toLowerCase();
    
    // First, check if we have any data for this city
    const [latestPrice] = await db
      .select()
      .from(propertyPrices)
      .where(eq(propertyPrices.city, cityLowerCase))
      .orderBy(desc(propertyPrices.id))
      .limit(1);
    
    if (!latestPrice) {
      return [];
    }
    
    // Then get all prices for this city with the same fetch date
    return await db
      .select()
      .from(propertyPrices)
      .where(
        and(
          eq(propertyPrices.city, cityLowerCase),
          eq(propertyPrices.fetchDate, latestPrice.fetchDate)
        )
      );
  }
  
  async createPropertyPrice(price: InsertPropertyPrice): Promise<PropertyPrice> {
    const [propertyPrice] = await db.insert(propertyPrices).values(price).returning();
    return propertyPrice;
  }
  
  async deletePropertyPricesByCity(city: string): Promise<void> {
    // Normalize city name for consistent storage
    const normalizedCity = city.toLowerCase();
    
    // Delete all property prices for this city
    await db.delete(propertyPrices).where(eq(propertyPrices.city, normalizedCity));
  }
}

export const storage = new DatabaseStorage();