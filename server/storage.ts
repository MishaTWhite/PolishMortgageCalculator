import { 
  users, type User, type InsertUser,
  interestRates, type InterestRate, type InsertInterestRate,
  exchangeRates, type ExchangeRate, type InsertExchangeRate
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private interestRates: Map<number, InterestRate>;
  private exchangeRates: Map<number, ExchangeRate>;
  userCurrentId: number;
  interestRateCurrentId: number;
  exchangeRateCurrentId: number;

  constructor() {
    this.users = new Map();
    this.interestRates = new Map();
    this.exchangeRates = new Map();
    this.userCurrentId = 1;
    this.interestRateCurrentId = 1;
    this.exchangeRateCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Interest rate methods
  async getLatestInterestRate(): Promise<InterestRate | undefined> {
    if (this.interestRates.size === 0) {
      return undefined;
    }
    
    // Get all interest rates and sort by ID (descending)
    const allRates = Array.from(this.interestRates.values());
    allRates.sort((a, b) => b.id - a.id);
    
    return allRates[0];
  }
  
  async createInterestRate(insertRate: InsertInterestRate): Promise<InterestRate> {
    const id = this.interestRateCurrentId++;
    const rate: InterestRate = { ...insertRate, id };
    this.interestRates.set(id, rate);
    return rate;
  }
  
  // Exchange rate methods
  async getLatestExchangeRate(): Promise<ExchangeRate | undefined> {
    if (this.exchangeRates.size === 0) {
      return undefined;
    }
    
    // Get all exchange rates and sort by ID (descending)
    const allRates = Array.from(this.exchangeRates.values());
    allRates.sort((a, b) => b.id - a.id);
    
    return allRates[0];
  }
  
  async createExchangeRate(insertRate: InsertExchangeRate): Promise<ExchangeRate> {
    const id = this.exchangeRateCurrentId++;
    const rate: ExchangeRate = { ...insertRate, id };
    this.exchangeRates.set(id, rate);
    return rate;
  }
}

export const storage = new MemStorage();
