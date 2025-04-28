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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private interestRates: Map<number, InterestRate>;
  private exchangeRates: Map<number, ExchangeRate>;
  private inflationRates: Map<number, InflationRate>;
  private stockIndices: Map<number, StockIndex>;
  private wiborRates: Map<number, WiborRate>;
  private bankOffers: Map<number, BankOffer>;
  private propertyPrices: Map<number, PropertyPrice>;
  
  userCurrentId: number;
  interestRateCurrentId: number;
  exchangeRateCurrentId: number;
  inflationRateCurrentId: number;
  stockIndexCurrentId: number;
  wiborRateCurrentId: number;
  bankOfferCurrentId: number;
  propertyPriceCurrentId: number;

  constructor() {
    this.users = new Map();
    this.interestRates = new Map();
    this.exchangeRates = new Map();
    this.inflationRates = new Map();
    this.stockIndices = new Map();
    this.wiborRates = new Map();
    this.bankOffers = new Map();
    this.propertyPrices = new Map();
    
    this.userCurrentId = 1;
    this.interestRateCurrentId = 1;
    this.exchangeRateCurrentId = 1;
    this.inflationRateCurrentId = 1;
    this.stockIndexCurrentId = 1;
    this.wiborRateCurrentId = 1;
    this.bankOfferCurrentId = 1;
    this.propertyPriceCurrentId = 1;
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
  
  // Inflation rate methods
  async getLatestInflationRate(): Promise<InflationRate | undefined> {
    if (this.inflationRates.size === 0) {
      return undefined;
    }
    
    // Get all inflation rates and sort by ID (descending)
    const allRates = Array.from(this.inflationRates.values());
    allRates.sort((a, b) => b.id - a.id);
    
    return allRates[0];
  }
  
  async getAllInflationRates(): Promise<InflationRate[]> {
    const allRates = Array.from(this.inflationRates.values());
    // Sort by date field (newest to oldest)
    allRates.sort((a, b) => {
      const dateA = new Date(a.date.split('.').reverse().join('-'));
      const dateB = new Date(b.date.split('.').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
    
    return allRates;
  }
  
  async createInflationRate(insertRate: InsertInflationRate): Promise<InflationRate> {
    const id = this.inflationRateCurrentId++;
    
    // Ensure monthlyRate is null if undefined
    const monthlyRate = insertRate.monthlyRate === undefined ? null : insertRate.monthlyRate;
    
    const rate: InflationRate = { 
      ...insertRate, 
      id,
      monthlyRate 
    };
    
    this.inflationRates.set(id, rate);
    return rate;
  }
  
  // Stock index methods
  async getLatestStockIndex(symbol: string): Promise<StockIndex | undefined> {
    if (this.stockIndices.size === 0) {
      return undefined;
    }
    
    // Get all stock indices with the specified symbol and sort by ID (descending)
    const allIndices = Array.from(this.stockIndices.values())
      .filter(index => index.symbol === symbol);
    
    if (allIndices.length === 0) {
      return undefined;
    }
    
    allIndices.sort((a, b) => b.id - a.id);
    
    return allIndices[0];
  }
  
  async createStockIndex(insertIndex: InsertStockIndex): Promise<StockIndex> {
    const id = this.stockIndexCurrentId++;
    
    // Ensure fiveYearReturn and tenYearReturn are null if undefined
    const fiveYearReturn = insertIndex.fiveYearReturn === undefined ? null : insertIndex.fiveYearReturn;
    const tenYearReturn = insertIndex.tenYearReturn === undefined ? null : insertIndex.tenYearReturn;
    
    const index: StockIndex = { 
      ...insertIndex, 
      id,
      fiveYearReturn,
      tenYearReturn
    };
    
    this.stockIndices.set(id, index);
    return index;
  }
  
  // WIBOR rate methods
  async getLatestWiborRates(): Promise<WiborRate[]> {
    if (this.wiborRates.size === 0) {
      return [];
    }
    
    // Group WIBOR rates by type and get the latest for each type
    const ratesByType = new Map<string, WiborRate>();
    
    for (const rate of this.wiborRates.values()) {
      const currentLatest = ratesByType.get(rate.type);
      
      if (!currentLatest || rate.id > currentLatest.id) {
        ratesByType.set(rate.type, rate);
      }
    }
    
    return Array.from(ratesByType.values());
  }
  
  async createWiborRate(insertRate: InsertWiborRate): Promise<WiborRate> {
    const id = this.wiborRateCurrentId++;
    const rate: WiborRate = { ...insertRate, id };
    this.wiborRates.set(id, rate);
    return rate;
  }
  
  // Bank offer methods
  async getLatestBankOffers(): Promise<BankOffer[]> {
    if (this.bankOffers.size === 0) {
      return [];
    }
    
    // Group bank offers by bank name and get the latest for each bank
    const offersByBank = new Map<string, BankOffer>();
    
    for (const offer of this.bankOffers.values()) {
      const currentLatest = offersByBank.get(offer.bankName);
      
      if (!currentLatest || offer.id > currentLatest.id) {
        offersByBank.set(offer.bankName, offer);
      }
    }
    
    // Return all offers sorted by total rate (ascending)
    const result = Array.from(offersByBank.values());
    result.sort((a, b) => parseFloat(a.totalRate) - parseFloat(b.totalRate));
    
    return result;
  }
  
  async createBankOffer(insertOffer: InsertBankOffer): Promise<BankOffer> {
    const id = this.bankOfferCurrentId++;
    
    // Ensure additionalInfo is null if undefined
    const additionalInfo = insertOffer.additionalInfo === undefined ? null : insertOffer.additionalInfo;
    
    const offer: BankOffer = { 
      ...insertOffer, 
      id,
      additionalInfo
    };
    
    this.bankOffers.set(id, offer);
    return offer;
  }
  
  // Property price methods
  async getPropertyPricesByCity(city: string): Promise<PropertyPrice[]> {
    if (this.propertyPrices.size === 0) {
      return [];
    }
    
    // Filter prices by city and sort by district
    const prices = Array.from(this.propertyPrices.values())
      .filter(price => price.city.toLowerCase() === city.toLowerCase());
    
    prices.sort((a, b) => a.district.localeCompare(b.district));
    
    return prices;
  }
  
  async createPropertyPrice(insertPrice: InsertPropertyPrice): Promise<PropertyPrice> {
    const id = this.propertyPriceCurrentId++;
    const price: PropertyPrice = { ...insertPrice, id };
    this.propertyPrices.set(id, price);
    return price;
  }
}

export const storage = new MemStorage();
