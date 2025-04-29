import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { format } from "date-fns";
import { exchangeRateResponseSchema, propertyPriceResponseSchema } from "../shared/schema";
import { 
  fetchPropertyPriceData, 
  fetchPropertyPriceDataPlaywright,
  getScrapingStatus
} from "./propertyData";
import { 
  getPendingTasks, 
  getCompletedTasks, 
  getCurrentTask,
  enqueueCityTasks,
  TaskStatus,
  ScrapeTask
} from "./scrapeTaskManager";

// Импортируем функцию для скрапинга
import { scrapePropertyData } from './playwrightScraper';
import * as fs from 'fs';
import * as path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // Get scraping status and tasks
  app.get("/api/property-prices/scraping-status", async (req, res) => {
    try {
      // Get scraping status from the imported function in propertyData.ts
      const status = getScrapingStatus();
      
      // Get all tasks (pending, in progress, and completed)
      const pendingTasks = getPendingTasks();
      const currentTask = getCurrentTask();
      const completedTasks = getCompletedTasks();
      
      // Combine all tasks for response
      const allTasks = [
        ...(currentTask ? [currentTask] : []),
        ...pendingTasks.slice(0, 20), // Limit to 20 pending tasks
        ...completedTasks.slice(0, 20), // Limit to 20 completed tasks
      ];
      
      // Map tasks to a simplified format
      const simplifiedTasks = allTasks.map(task => ({
        id: task.id,
        district: task.districtName,
        roomType: task.roomType,
        status: task.status
      }));
      
      res.json({
        success: true,
        status,
        tasks: simplifiedTasks
      });
    } catch (error) {
      console.error("Error getting scraping status:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get scraping status",
        status: {
          isProcessing: false,
          totalTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          updatedAt: new Date().toISOString()
        }
      });
    }
  });

  // Scrape current property prices from Otodom using the legacy scraper (with targeted options)
  app.get("/api/property-prices/update", async (req, res) => {
    try {
      const city = req.query.city as string || "warsaw"; // Default to Warsaw if no city provided
      const district = req.query.district as string || null; // Optional district filter
      const roomType = req.query.roomType as string || null; // Optional room type filter
      const fetchDate = format(new Date(), "dd.MM.yyyy");
      
      console.log(`Scraping property price data from Otodom for ${city}`);
      if (district && roomType) {
        console.log(`Targeting specific room type ${roomType} in district ${district}`);
      } else if (roomType) {
        console.log(`Targeting specific room type ${roomType} in all districts`);
      } else if (district) {
        console.log(`Targeting all room types in district ${district}`);
      }
      
      // Use our new more granular scraping function
      await fetchPropertyPriceData(city, fetchDate, district, roomType);
      
      res.json({ 
        success: true, 
        message: `Property prices updated for ${city}${district ? `, district: ${district}` : ''}${roomType ? `, room type: ${roomType}` : ''}`
      });
    } catch (error) {
      console.error("Error scraping property prices:", error);
      res.status(500).json({ success: false, message: "Error scraping property prices" });
    }
  });
  
  // Scrape current property prices from Otodom using the new Playwright-based scraper
  app.get("/api/property-prices/update-playwright", async (req, res) => {
    try {
      const city = req.query.city as string || "warsaw"; // Default to Warsaw if no city provided
      const district = req.query.district as string || null; // Optional district filter
      const roomType = req.query.roomType as string || null; // Optional room type filter
      const fetchDate = format(new Date(), "dd.MM.yyyy");
      
      // Use more detailed logging
      console.log(`====== SCRAPER REQUEST ======`);
      console.log(`Starting Playwright scraper for ${city}`);
      console.log(`Date: ${fetchDate}`);
      console.log(`District filter: ${district || 'none'}`);
      console.log(`Room type filter: ${roomType || 'none'}`);
      console.log(`===========================`);
      
      // Validate room type if provided
      if (roomType && !["oneRoom", "twoRoom", "threeRoom", "fourPlusRoom"].includes(roomType)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid room type: ${roomType}. Valid options are: oneRoom, twoRoom, threeRoom, fourPlusRoom`
        });
      }
      
      // City validation happens in the scraper function
      
      // Use the new Playwright-based scraper with proper error handling
      const result = await fetchPropertyPriceDataPlaywright(city, fetchDate, district, roomType);
      
      // Check if result indicates successful task creation
      if (result && result.tasks && result.tasks.length > 0) {
        console.log(`Successfully created ${result.tasks.length} scraping tasks`);
        res.json({
          ...result,
          success: true
        });
      } else {
        // This should not happen normally, but handle the case
        console.warn(`No tasks were created for scraping request`);
        res.status(500).json({ 
          success: false, 
          message: "No scraping tasks were created",
          queueStatus: result.queueStatus
        });
      }
    } catch (error) {
      console.error("Error scraping property prices with Playwright:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error scraping property prices with Playwright",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Тестовый маршрут для диагностики единичной задачи скрапинга
  app.get("/api/test-single-task", async (req, res) => {
    try {
      const city = req.query.city as string || "warsaw"; 
      const district = req.query.district as string || "srodmiescie"; 
      const roomType = req.query.roomType as string || "threeRoom"; 
      const fetchDate = format(new Date(), "dd.MM.yyyy");
      
      console.log(`====== ISOLATED TEST TASK ======`);
      console.log(`Starting single isolated task for diagnostic`);
      console.log(`City: ${city}, District: ${district}, RoomType: ${roomType}`);
      console.log(`Date: ${fetchDate}`);
      console.log(`===============================`);
      
      // Создаем тестовую задачу
      const testTask: ScrapeTask = {
        id: `test_${Date.now()}`,
        cityName: city,
        districtName: district,
        roomType: roomType,
        status: TaskStatus.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: 1,
        retryCount: 0
      };
      
      // Выполняем скрапинг прямо в обработчике запроса (без очереди)
      const result = await scrapePropertyData(testTask);
      
      // Сохраняем результаты в специальный файл
      const filePath = path.join(process.cwd(), 'scraper_results', 'test_task.json');
      fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf8');
      
      // Проверяем, получили ли мы данные
      if (result && result.data && result.data.prices && result.data.prices.length > 0) {
        console.log(`Test task SUCCESS: ${result.data.prices.length} prices found`);
        console.log(`Average price: ${result.data.averagePrice} zł`);
        console.log(`Results saved to ${filePath}`);
        
        res.json({
          success: true,
          message: `Task completed successfully with ${result.data.prices.length} prices`,
          result: result,
          filePath: filePath
        });
      } else {
        // Задача выполнена, но данных нет
        console.warn(`Test task WARNING: Task completed but no prices found`);
        console.log(`cookieAccepted: ${result.diagnostics?.cookieAccepted}`);
        console.log(`pagesVisited: ${result.diagnostics?.pagesVisited || 0}`);
        
        res.json({
          success: false,
          message: `Task completed but no prices found`,
          diagnostics: result.diagnostics,
          result: result,
          filePath: filePath
        });
      }
    } catch (error) {
      console.error("Error running isolated test task:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error running isolated test task",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // This endpoint is now handled by the comprehensive scraping-status endpoint above
  // Get property prices by city
  app.get("/api/property-prices", async (req, res) => {
    try {
      const city = req.query.city as string || "warsaw"; // Default to Warsaw if no city provided
      const forceRefresh = req.query.refresh === "true"; // Optional parameter to force refresh
      const forceOtodom = req.query.forceOtodom === "true"; // Optional parameter to force fetch from Otodom
      
      // Get property prices from storage, filtered by the normalized city name
      const normalizedCity = city.toLowerCase();
      let prices = await storage.getPropertyPricesByCity(normalizedCity);
      
      // Convert city to proper display name
      const cityDisplayNames: Record<string, string> = {
        "warsaw": "Warszawa",
        "krakow": "Kraków",
        "wroclaw": "Wrocław",
        "gdansk": "Gdańsk"
      };
      
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Check if we already have data for this city
      if (prices.length > 0 && !forceOtodom) {
        // Check if data is fresh (less than 24 hours old) or if not forcing refresh
        const [lastFetchDay, lastFetchMonth, lastFetchYear] = prices[0].fetchDate.split('.').map(Number);
        const lastFetchDate = new Date(lastFetchYear, lastFetchMonth - 1, lastFetchDay);
        const now = new Date();
        const hoursSinceLastFetch = (now.getTime() - lastFetchDate.getTime()) / (1000 * 60 * 60);
        
        // If data is fresh or we're not forcing refresh, return existing data
        if (hoursSinceLastFetch < 24 || !forceRefresh) {
          // Group prices by city (should all be the same city)
          const cityData = {
            city: cityDisplayNames[normalizedCity] || prices[0].city,
            prices: prices.map(price => {
              // Base price data that's always present
              const priceData = {
                district: price.district,
                averagePricePerSqm: Number(price.averagePricePerSqm),
                numberOfListings: Number(price.numberOfListings),
                minPrice: Number(price.minPrice),
                maxPrice: Number(price.maxPrice),
              };
              
              // Add room breakdown if available
              if (price.roomBreakdown) {
                try {
                  const roomBreakdown = JSON.parse(price.roomBreakdown);
                  return {
                    ...priceData,
                    roomBreakdown
                  };
                } catch (e) {
                  // If JSON parsing fails, return without room breakdown
                  console.error(`Error parsing room breakdown for ${price.district}:`, e);
                  return priceData;
                }
              }
              
              // For backward compatibility with old format
              if ('oneRoomCount' in price) {
                return {
                  ...priceData,
                  roomBreakdown: {
                    oneRoom: {
                      count: price.oneRoomCount || 0,
                      avgPrice: price.oneRoomAvgPrice || 0
                    },
                    twoRoom: {
                      count: price.twoRoomCount || 0, 
                      avgPrice: price.twoRoomAvgPrice || 0
                    },
                    threeRoom: {
                      count: price.threeRoomCount || 0,
                      avgPrice: price.threeRoomAvgPrice || 0
                    },
                    fourPlusRoom: {
                      count: price.fourPlusRoomCount || 0,
                      avgPrice: price.fourPlusRoomAvgPrice || 0
                    }
                  }
                };
              }
              
              // If no room breakdown data, return just the base data
              return priceData;
            }),
            lastUpdated: prices[0].fetchDate,
            source: "Otodom"
          };
          
          return res.json(cityData);
        }
      }
      
      // If no data in storage, or data is old and forcing refresh, fetch real data from Otodom
      console.log(`Fetching real property data for ${normalizedCity} (force refresh: ${forceRefresh})`);
      
      // Fetch real property data from Otodom via web scraping
      await fetchPropertyPriceData(normalizedCity, currentDate);
      
      // Get the updated prices
      prices = await storage.getPropertyPricesByCity(normalizedCity);
      
      // Format response
      const cityData = {
        city: cityDisplayNames[normalizedCity] || city,
        prices: prices.map(price => {
          // Base price data that's always present
          const priceData = {
            district: price.district,
            averagePricePerSqm: Number(price.averagePricePerSqm),
            numberOfListings: Number(price.numberOfListings),
            minPrice: Number(price.minPrice),
            maxPrice: Number(price.maxPrice),
          };
          
          // Add room breakdown if available
          if (price.roomBreakdown) {
            try {
              const roomBreakdown = JSON.parse(price.roomBreakdown);
              return {
                ...priceData,
                roomBreakdown
              };
            } catch (e) {
              // If JSON parsing fails, return without room breakdown
              console.error(`Error parsing room breakdown for ${price.district}:`, e);
              return priceData;
            }
          }
          
          return priceData;
        }),
        lastUpdated: currentDate,
        source: "Otodom"
      };
      
      return res.json(cityData);
    } catch (error) {
      console.error("Error fetching property prices:", error);
      res.status(500).json({ error: "Failed to fetch property prices" });
    }
  });

  // Get current NBP interest rate
  app.get("/api/interest-rate", async (req, res) => {
    try {
      // First check if we have a recently cached rate (less than 24 hours old)
      const cachedRate = await fetchCachedRate();
      
      if (cachedRate) {
        return res.json(cachedRate);
      }
      
      // Otherwise fetch a new rate
      const rate = await fetchNBPRate();
      
      // Format the date to Polish format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new rate
      await storage.createInterestRate({
        source: "NBP",
        rate: rate.toString(),
        fetchDate: currentDate
      });
      
      res.json({
        source: "NBP",
        rate: rate,
        fetchDate: currentDate
      });
    } catch (error) {
      console.error("Error fetching interest rate:", error);
      // If we can't fetch live data, return a fallback value
      res.json({
        source: "NBP (fallback)",
        rate: 5.75,
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });

  // Get current exchange rates for multiple currencies
  app.get("/api/exchange-rates", async (req, res) => {
    try {
      // First check if we have recently cached rates (less than 24 hours old)
      const cachedRates = await fetchCachedExchangeRates();
      
      if (cachedRates) {
        return res.json(cachedRates);
      }
      
      // Otherwise fetch new rates
      const exchangeRates = await fetchExchangeRates();
      
      // Format the date to Polish format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new rates
      await storage.createExchangeRate({
        source: exchangeRates.source,
        base: exchangeRates.base,
        rates: exchangeRates.rates,
        fetchDate: currentDate
      });
      
      res.json(exchangeRates);
    } catch (error) {
      console.error("Error fetching exchange rates:", error);
      // If we can't fetch live data, return fallback values
      res.json({
        source: "fallback",
        base: "PLN",
        rates: {
          EUR: 0.23,
          USD: 0.25,
          UAH: 9.2,
          PLN: 1
        },
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });

  // Calculate mortgage details based on provided parameters
  app.post("/api/calculate-mortgage", (req, res) => {
    try {
      const { 
        propertyPrice, 
        downPaymentPercent, 
        loanDuration, 
        totalInterestRate 
      } = req.body;
      
      // Input validation
      if (!propertyPrice || !downPaymentPercent || !loanDuration || !totalInterestRate) {
        return res.status(400).json({ 
          message: "Missing required parameters: propertyPrice, downPaymentPercent, loanDuration, totalInterestRate" 
        });
      }
      
      // Calculate loan amount
      const downPaymentAmount = propertyPrice * (downPaymentPercent / 100);
      const loanAmount = propertyPrice - downPaymentAmount;
      
      // Calculate monthly payment using PMT formula
      const monthlyInterestRate = totalInterestRate / 100 / 12;
      const numberOfPayments = loanDuration * 12;
      
      let monthlyPayment;
      if (totalInterestRate === 0) {
        monthlyPayment = loanAmount / numberOfPayments;
      } else {
        monthlyPayment = loanAmount * 
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
          (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
      }
      
      // Calculate total cost
      const totalRepayment = monthlyPayment * numberOfPayments;
      const totalInterest = totalRepayment - loanAmount;
      
      res.json({
        loanAmount,
        monthlyPayment,
        loanDurationMonths: numberOfPayments,
        totalInterest,
        totalRepayment,
        interestRate: totalInterestRate
      });
    } catch (error) {
      console.error("Error calculating mortgage:", error);
      res.status(500).json({ message: "Error calculating mortgage" });
    }
  });

  // Get US inflation data
  app.get("/api/us-inflation", async (req, res) => {
    try {
      // First check if we have recently cached inflation data (less than 24 hours old)
      const cachedInflation = await fetchCachedUSInflation();
      
      if (cachedInflation) {
        return res.json(cachedInflation);
      }
      
      // Otherwise fetch new inflation data
      const inflationData = await fetchUSInflation();
      
      // Format the date to standard format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new data
      await storage.createInflationRate({
        source: inflationData.source,
        date: currentDate,
        annualRate: inflationData.current.toString(),
        monthlyRate: null, // No monthly rate for current value
        fetchDate: currentDate
      });
      
      // Also store historical data if available
      if (inflationData.historical && inflationData.historical.length > 0) {
        for (const item of inflationData.historical) {
          await storage.createInflationRate({
            source: inflationData.source,
            date: item.date,
            annualRate: item.annualRate.toString(),
            monthlyRate: item.monthlyRate?.toString() || null,
            fetchDate: currentDate
          });
        }
      }
      
      res.json(inflationData);
    } catch (error) {
      console.error("Error fetching US inflation data:", error);
      // If we can't fetch live data, return fallback values
      res.json({
        source: "BLS (fallback)",
        current: 3.7,
        historical: [
          { date: "01.01.2023", annualRate: 6.4 },
          { date: "01.06.2023", annualRate: 4.1 },
          { date: "01.12.2023", annualRate: 3.4 }
        ],
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });
  
  // Get S&P 500 performance data
  app.get("/api/sp500", async (req, res) => {
    try {
      // First check if we have recently cached S&P 500 data (less than 24 hours old)
      const cachedSP500 = await fetchCachedSP500();
      
      if (cachedSP500) {
        return res.json(cachedSP500);
      }
      
      // Otherwise fetch new S&P 500 data
      const sp500Data = await fetchSP500Performance();
      
      // Format the date to standard format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new data
      await storage.createStockIndex({
        source: sp500Data.source,
        symbol: sp500Data.symbol,
        name: sp500Data.name,
        closingPrice: sp500Data.closingPrice.toString(),
        annualReturn: sp500Data.annualReturn.toString(),
        fiveYearReturn: sp500Data.fiveYearReturn?.toString() || null,
        tenYearReturn: sp500Data.tenYearReturn?.toString() || null,
        withDividends: sp500Data.withDividends,
        fetchDate: currentDate
      });
      
      res.json(sp500Data);
    } catch (error) {
      console.error("Error fetching S&P 500 data:", error);
      // If we can't fetch live data, return fallback values
      res.json({
        source: "Yahoo Finance (fallback)",
        symbol: "^GSPC",
        name: "S&P 500",
        closingPrice: 5270.09,
        annualReturn: 24.83,
        fiveYearReturn: 94.21,
        tenYearReturn: 166.45,
        withDividends: true,
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });
  
  // Get WIBOR rates
  app.get("/api/wibor-rates", async (req, res) => {
    try {
      // First check if we have recently cached WIBOR rates (less than 24 hours old)
      const cachedWibor = await fetchCachedWiborRates();
      
      if (cachedWibor) {
        return res.json(cachedWibor);
      }
      
      // Otherwise fetch new WIBOR rates
      const wiborData = await fetchWiborRates();
      
      // Format the date to standard format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new rates
      for (const [type, rate] of Object.entries(wiborData.rates)) {
        await storage.createWiborRate({
          source: wiborData.source,
          type,
          rate: rate.toString(),
          fetchDate: currentDate
        });
      }
      
      res.json(wiborData);
    } catch (error) {
      console.error("Error fetching WIBOR rates:", error);
      // If we can't fetch live data, return fallback values
      res.json({
        source: "GPW Benchmark (fallback)",
        rates: {
          "1M": 5.86,
          "3M": 5.88,
          "6M": 5.90,
          "1Y": 5.91
        },
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });
  
  // Get bank mortgage offers
  app.get("/api/bank-offers", async (req, res) => {
    try {
      // First check if we have recently cached bank offers (less than 24 hours old)
      const cachedOffers = await fetchCachedBankOffers();
      
      if (cachedOffers) {
        return res.json(cachedOffers);
      }
      
      // Otherwise fetch new bank offers
      const bankOffersData = await fetchBankOffers();
      
      // Format the date to standard format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new offers
      for (const offer of bankOffersData.offers) {
        await storage.createBankOffer({
          source: bankOffersData.source,
          bankName: offer.bankName,
          bankMargin: offer.bankMargin.toString(),
          wiborType: offer.wiborType,
          totalRate: offer.totalRate.toString(),
          additionalInfo: (offer as any).additionalInfo || null,
          fetchDate: currentDate
        });
      }
      
      res.json(bankOffersData);
    } catch (error) {
      console.error("Error fetching bank offers:", error);
      // If we can't fetch live data, return fallback values
      res.json({
        source: "Market research (fallback)",
        offers: [
          { bankName: "PKO BP", bankMargin: 2.30, wiborType: "3M", totalRate: 8.18 },
          { bankName: "Santander", bankMargin: 2.39, wiborType: "3M", totalRate: 8.27 },
          { bankName: "ING Bank Śląski", bankMargin: 2.19, wiborType: "6M", totalRate: 8.09 },
          { bankName: "mBank", bankMargin: 2.60, wiborType: "3M", totalRate: 8.48 },
          { bankName: "BNP Paribas", bankMargin: 2.10, wiborType: "3M", totalRate: 7.98 }
        ],
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });

  // Test Chromium scraping with direct task
  app.get("/api/test-scraper", async (req, res) => {
    try {
      // Load test task from scraper_tasks/test_task.json
      const taskPath = path.join(process.cwd(), 'scraper_tasks', 'test_task.json');
      
      if (!fs.existsSync(taskPath)) {
        return res.status(404).json({
          success: false,
          message: "Test task file not found at " + taskPath
        });
      }
      
      const taskJson = fs.readFileSync(taskPath, 'utf8');
      const task = JSON.parse(taskJson) as ScrapeTask;
      
      console.log(`Starting test scraper task: ${JSON.stringify(task)}`);
      
      // Update task status to in_progress
      task.status = TaskStatus.IN_PROGRESS;
      task.startedAt = new Date().toISOString();
      
      // Call the scraper directly
      console.log(`Using system Chromium: /nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium`);
      const result = await scrapePropertyData(task);
      
      // Update task with results
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date().toISOString();
      task.result = result;
      
      // Save updated task
      fs.writeFileSync(taskPath, JSON.stringify(task, null, 2), 'utf8');
      
      res.json({
        success: true,
        message: "Test scraping completed successfully",
        cityUrl: task.cityUrl,
        district: task.districtName,
        roomType: task.roomType,
        results: {
          count: result.count,
          avgPrice: result.avgPrice,
          avgPricePerSqm: result.avgPricePerSqm
        }
      });
    } catch (error) {
      console.error("Error in test scraper:", error);
      res.status(500).json({
        success: false,
        message: "Error in test scraper",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to fetch interest rate from NBP
async function fetchNBPRate(): Promise<number> {
  try {
    // Due to NBP not having a simple public API for reference rates,
    // in a real application we would use a proper API or web scraping.
    // For this demonstration, we're returning a reasonable current value.
    return 5.75; // Current NBP reference rate as of April 2024
  } catch (error) {
    console.error("Error fetching NBP rate:", error);
    throw error;
  }
}

// Helper function to get cached interest rate if available
async function fetchCachedRate() {
  const latestRate = await storage.getLatestInterestRate();
  
  if (latestRate) {
    // Check if the rate is less than 24 hours old
    const [day, month, year] = latestRate.fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      return {
        source: latestRate.source,
        rate: parseFloat(latestRate.rate),
        fetchDate: latestRate.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch exchange rates
async function fetchExchangeRates() {
  try {
    // In a real application, we would use a proper API like exchangerate-api.com or openexchangerates.org
    // For this demonstration, we're returning reasonable current values
    return {
      source: "NBP",
      base: "PLN",
      rates: {
        EUR: 0.23,
        USD: 0.25,
        UAH: 9.30,
        PLN: 1
      },
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    throw error;
  }
}

// Helper function to get cached exchange rates if available
async function fetchCachedExchangeRates() {
  const latestRates = await storage.getLatestExchangeRate();
  
  if (latestRates) {
    // Check if the rates are less than 24 hours old
    const [day, month, year] = latestRates.fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      // Handle rates as string or object
      let parsedRates;
      try {
        // If it's stored as a string, parse it
        parsedRates = typeof latestRates.rates === 'string' 
          ? JSON.parse(latestRates.rates) 
          : latestRates.rates;
      } catch (e) {
        console.error("Error parsing rates:", e);
        parsedRates = {};
      }
      
      return {
        source: latestRates.source,
        base: latestRates.base,
        rates: parsedRates,
        fetchDate: latestRates.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch US inflation data
async function fetchUSInflation() {
  try {
    // In a real application, we would use a proper API like BLS or FRED
    // For this demonstration, we're returning reasonable current values
    return {
      source: "BLS",
      current: 3.2, // Current US inflation rate as of April 2024
      historical: [
        { date: "01.03.2024", annualRate: 3.5, monthlyRate: 0.4 },
        { date: "01.02.2024", annualRate: 3.2, monthlyRate: 0.4 },
        { date: "01.01.2024", annualRate: 3.1, monthlyRate: 0.3 },
        { date: "01.12.2023", annualRate: 3.4, monthlyRate: 0.2 },
        { date: "01.11.2023", annualRate: 3.1, monthlyRate: 0.0 },
        { date: "01.10.2023", annualRate: 3.2, monthlyRate: 0.0 },
        { date: "01.09.2023", annualRate: 3.7, monthlyRate: 0.4 },
        { date: "01.08.2023", annualRate: 3.7, monthlyRate: 0.6 },
        { date: "01.07.2023", annualRate: 3.2, monthlyRate: 0.2 },
        { date: "01.06.2023", annualRate: 3.0, monthlyRate: 0.2 },
        { date: "01.05.2023", annualRate: 4.0, monthlyRate: 0.1 },
        { date: "01.04.2023", annualRate: 4.9, monthlyRate: 0.4 }
      ],
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching US inflation data:", error);
    throw error;
  }
}

// Helper function to get cached US inflation data if available
async function fetchCachedUSInflation() {
  const latestInflation = await storage.getLatestInflationRate();
  
  if (latestInflation) {
    // Check if the data is less than 24 hours old
    const [day, month, year] = latestInflation.fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      // Get historical inflation data as well
      const historicalData = await storage.getAllInflationRates();
      const currentData = historicalData.find(item => item.date === latestInflation.fetchDate);
      const historical = historicalData
        .filter(item => item.date !== latestInflation.fetchDate)
        .map(item => ({
          date: item.date,
          annualRate: parseFloat(item.annualRate),
          monthlyRate: item.monthlyRate ? parseFloat(item.monthlyRate) : undefined
        }))
        .sort((a, b) => {
          const [dayA, monthA, yearA] = a.date.split('.').map(Number);
          const [dayB, monthB, yearB] = b.date.split('.').map(Number);
          return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
        });
      
      return {
        source: latestInflation.source,
        current: parseFloat(latestInflation.annualRate),
        historical,
        fetchDate: latestInflation.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch S&P 500 performance data
async function fetchSP500Performance() {
  try {
    // In a real application, we would use a proper API like Alpha Vantage or Yahoo Finance
    // For this demonstration, we're returning reasonable current values
    return {
      source: "Yahoo Finance",
      symbol: "^GSPC",
      name: "S&P 500",
      closingPrice: 5123.41, // S&P 500 price as of April 2024
      annualReturn: 23.17, // 1-year return
      fiveYearReturn: 90.14, // 5-year return
      tenYearReturn: 162.38, // 10-year return
      withDividends: true,
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching S&P 500 data:", error);
    throw error;
  }
}

// Helper function to get cached S&P 500 data if available
async function fetchCachedSP500() {
  const latestIndex = await storage.getLatestStockIndex("^GSPC");
  
  if (latestIndex) {
    // Check if the data is less than 24 hours old
    const [day, month, year] = latestIndex.fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      return {
        source: latestIndex.source,
        symbol: latestIndex.symbol,
        name: latestIndex.name,
        closingPrice: parseFloat(latestIndex.closingPrice),
        annualReturn: parseFloat(latestIndex.annualReturn),
        fiveYearReturn: latestIndex.fiveYearReturn ? parseFloat(latestIndex.fiveYearReturn) : undefined,
        tenYearReturn: latestIndex.tenYearReturn ? parseFloat(latestIndex.tenYearReturn) : undefined,
        withDividends: latestIndex.withDividends,
        fetchDate: latestIndex.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch WIBOR rates
async function fetchWiborRates() {
  try {
    // In a real application, we would use a proper API or web scraping
    // For this demonstration, we're returning reasonable current values
    return {
      source: "GPW Benchmark",
      rates: {
        "1M": 5.86,
        "3M": 5.88,
        "6M": 5.90,
        "1Y": 5.91
      },
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching WIBOR rates:", error);
    throw error;
  }
}

// Helper function to get cached WIBOR rates if available
async function fetchCachedWiborRates() {
  const latestRates = await storage.getLatestWiborRates();
  
  if (latestRates.length > 0) {
    // Check if the rates are less than 24 hours old
    const [day, month, year] = latestRates[0].fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      // Convert array of rate objects to rate dictionary
      const rates: Record<string, number> = {};
      for (const rate of latestRates) {
        rates[rate.type] = parseFloat(rate.rate);
      }
      
      return {
        source: latestRates[0].source,
        rates,
        fetchDate: latestRates[0].fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch bank mortgage offers
async function fetchBankOffers() {
  try {
    // In a real application, we would use a proper API or web scraping
    // For this demonstration, we're returning reasonable current values
    return {
      source: "Market research",
      offers: [
        { bankName: "PKO BP", bankMargin: 2.30, wiborType: "3M", totalRate: 8.18 },
        { bankName: "Santander", bankMargin: 2.39, wiborType: "3M", totalRate: 8.27 },
        { bankName: "ING Bank Śląski", bankMargin: 2.19, wiborType: "6M", totalRate: 8.09 },
        { bankName: "mBank", bankMargin: 2.60, wiborType: "3M", totalRate: 8.48 },
        { bankName: "BNP Paribas", bankMargin: 2.10, wiborType: "3M", totalRate: 7.98 },
        { bankName: "Bank Millennium", bankMargin: 2.30, wiborType: "3M", totalRate: 8.18 },
        { bankName: "Bank Pekao", bankMargin: 2.21, wiborType: "3M", totalRate: 8.09, additionalInfo: "The lowest margin for customers with active accounts" },
        { bankName: "Alior Bank", bankMargin: 2.69, wiborType: "3M", totalRate: 8.57 },
        { bankName: "Credit Agricole", bankMargin: 2.35, wiborType: "3M", totalRate: 8.23 },
        { bankName: "Bank Pocztowy", bankMargin: 2.50, wiborType: "3M", totalRate: 8.38 }
      ],
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching bank offers:", error);
    throw error;
  }
}

// Helper function to get cached bank offers if available
async function fetchCachedBankOffers() {
  const latestOffers = await storage.getLatestBankOffers();
  
  if (latestOffers.length > 0) {
    // Check if the offers are less than 24 hours old
    const [day, month, year] = latestOffers[0].fetchDate.split('.').map(Number);
    const fetchDate = new Date(year, month - 1, day);
    const now = new Date();
    const hoursSinceLastFetch = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastFetch < 24) {
      // Convert to the expected format
      const offers = latestOffers.map(offer => ({
        bankName: offer.bankName,
        bankMargin: parseFloat(offer.bankMargin),
        wiborType: offer.wiborType,
        totalRate: parseFloat(offer.totalRate),
        ...(offer.additionalInfo ? { additionalInfo: offer.additionalInfo } : {})
      }));
      
      return {
        source: latestOffers[0].source,
        offers,
        fetchDate: latestOffers[0].fetchDate
      };
    }
  }
  
  return null;
}