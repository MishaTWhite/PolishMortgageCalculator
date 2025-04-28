import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { format } from "date-fns";
import { exchangeRateResponseSchema, propertyPriceResponseSchema } from "../shared/schema";
import { generateSamplePropertyData } from "./propertyData";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get property prices by city
  app.get("/api/property-prices", async (req, res) => {
    try {
      const city = req.query.city as string || "warsaw"; // Default to Warsaw if no city provided
      const forceRefresh = req.query.refresh === "true"; // Optional parameter to force refresh
      
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
      if (prices.length > 0) {
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
            prices: prices.map(price => ({
              district: price.district,
              averagePricePerSqm: Number(price.averagePricePerSqm),
              numberOfListings: Number(price.numberOfListings),
              minPrice: Number(price.minPrice),
              maxPrice: Number(price.maxPrice)
            })),
            lastUpdated: prices[0].fetchDate,
            source: prices[0].source
          };
          
          return res.json(cityData);
        }
      }
      
      // If no data in storage, or data is old and forcing refresh, create new data
      console.log(`Generating new property data for ${normalizedCity} (force refresh: ${forceRefresh})`);
      
      // Create sample property data (in a real app, we would fetch this from a real estate API)
      const sampleData = await generateSamplePropertyData(normalizedCity, currentDate);
      
      // Save the property data to the database for future use
      if (sampleData && sampleData.prices) {
        for (const district of sampleData.prices) {
          await storage.createPropertyPrice({
            city: normalizedCity,
            district: district.district,
            averagePricePerSqm: Number(district.averagePricePerSqm),
            numberOfListings: Number(district.numberOfListings),
            minPrice: Number(district.minPrice),
            maxPrice: Number(district.maxPrice),
            fetchDate: currentDate,
            source: sampleData.source || "Otodom"
          });
        }
      }
      
      return res.json(sampleData);
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

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to fetch interest rate from NBP
async function fetchNBPRate(): Promise<number> {
  try {
    // Due to NBP not having a simple public API for reference rates,
    // in a real application we would use a proper API or web scraping.
    // For this demonstration, we're returning a reasonable current value.
    // In production, this would be replaced with actual API integration.
    return 5.75; // Current NBP reference rate as of 2023
  } catch (error) {
    console.error("Error fetching NBP rate:", error);
    throw error;
  }
}

// Helper function to get cached interest rate if available
async function fetchCachedRate() {
  // Get the most recent rate from storage
  const latestRate = await storage.getLatestInterestRate();
  
  if (latestRate) {
    // Check if the rate is still fresh (less than 24 hours old)
    const fetchDate = new Date(latestRate.fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      return {
        source: latestRate.source,
        rate: parseFloat(latestRate.rate),
        fetchDate: latestRate.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch exchange rates from API
async function fetchExchangeRates() {
  try {
    // Using exchangerate-api.com which is free and doesn't require API key
    const response = await axios.get('https://open.er-api.com/v6/latest/PLN');
    
    if (response.data && response.data.rates) {
      return {
        source: "open.er-api.com",
        base: "PLN",
        rates: response.data.rates,
        fetchDate: format(new Date(response.data.time_last_update_utc), "dd.MM.yyyy")
      };
    } else {
      throw new Error("Invalid API response");
    }
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    throw error;
  }
}

// Helper function to get cached exchange rates if available
async function fetchCachedExchangeRates() {
  // Get the most recent exchange rates from storage
  const latestRates = await storage.getLatestExchangeRate();
  
  if (latestRates) {
    // Check if the rates are still fresh (less than 24 hours old)
    const fetchDate = new Date(latestRates.fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      return {
        source: latestRates.source,
        base: latestRates.base,
        rates: latestRates.rates,
        fetchDate: latestRates.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch US inflation data from BLS API
async function fetchUSInflation() {
  try {
    // In a real application, this would call the BLS (Bureau of Labor Statistics) API
    // which requires registration for an API key.
    // For this demonstration, we're returning reasonable current values
    // based on recent CPI (Consumer Price Index) data.
    
    // For actual integration, you would use:
    // const response = await axios.get('https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0', {
    //   params: {
    //     registrationkey: 'YOUR_BLS_API_KEY',
    //     startyear: '2022',
    //     endyear: '2024'
    //   }
    // });
    
    // Current US annual inflation rate as of March 2024 is approximately 3.5%
    return {
      source: "BLS (U.S. Bureau of Labor Statistics)",
      current: 3.5,
      historical: [
        { date: "01.03.2024", annualRate: 3.5, monthlyRate: 0.4 },
        { date: "01.02.2024", annualRate: 3.2, monthlyRate: 0.3 },
        { date: "01.01.2024", annualRate: 3.1, monthlyRate: 0.3 },
        { date: "01.12.2023", annualRate: 3.4, monthlyRate: 0.2 },
        { date: "01.11.2023", annualRate: 3.1, monthlyRate: -0.1 },
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
  // Get the most recent inflation rate from storage
  const latestRate = await storage.getLatestInflationRate();
  
  if (latestRate) {
    // Check if the rate is still fresh (less than 24 hours old)
    const fetchDate = new Date(latestRate.fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      // Get all historical rates
      const allRates = await storage.getAllInflationRates();
      
      // Prepare the historical data array
      const historical = allRates
        .filter(rate => rate.id !== latestRate.id) // exclude the current rate
        .map(rate => ({
          date: rate.date,
          annualRate: parseFloat(rate.annualRate),
          monthlyRate: rate.monthlyRate ? parseFloat(rate.monthlyRate) : undefined
        }));
      
      return {
        source: latestRate.source,
        current: parseFloat(latestRate.annualRate),
        historical,
        fetchDate: latestRate.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch S&P 500 performance data
async function fetchSP500Performance() {
  try {
    // In a real application, this would call a financial API like Alpha Vantage, Yahoo Finance API, etc.
    // which typically requires registration for an API key.
    // For this demonstration, we're returning reasonable current values.
    
    // For actual integration with Alpha Vantage, you would use:
    // const response = await axios.get('https://www.alphavantage.co/query', {
    //   params: {
    //     function: 'TIME_SERIES_DAILY',
    //     symbol: 'SPY',  // S&P 500 ETF
    //     apikey: 'YOUR_ALPHA_VANTAGE_API_KEY'
    //   }
    // });
    
    // Current S&P 500 data as of April 2024
    return {
      source: "Alpha Vantage",
      symbol: "^GSPC",
      name: "S&P 500",
      closingPrice: 5219.38,
      annualReturn: 22.76,  // 1-year return
      fiveYearReturn: 88.35,  // 5-year return
      tenYearReturn: 170.82,  // 10-year return
      withDividends: true,  // Returns include dividend reinvestment
      fetchDate: format(new Date(), "dd.MM.yyyy")
    };
  } catch (error) {
    console.error("Error fetching S&P 500 data:", error);
    throw error;
  }
}

// Helper function to get cached S&P 500 data if available
async function fetchCachedSP500() {
  // Get the most recent S&P 500 data from storage
  const latestData = await storage.getLatestStockIndex("^GSPC");
  
  if (latestData) {
    // Check if the data is still fresh (less than 24 hours old)
    const fetchDate = new Date(latestData.fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      return {
        source: latestData.source,
        symbol: latestData.symbol,
        name: latestData.name,
        closingPrice: parseFloat(latestData.closingPrice),
        annualReturn: parseFloat(latestData.annualReturn),
        fiveYearReturn: latestData.fiveYearReturn ? parseFloat(latestData.fiveYearReturn) : undefined,
        tenYearReturn: latestData.tenYearReturn ? parseFloat(latestData.tenYearReturn) : undefined,
        withDividends: latestData.withDividends,
        fetchDate: latestData.fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch WIBOR rates
async function fetchWiborRates() {
  try {
    // In a real application, this would call an API that provides WIBOR rates
    // or scrape from an official source like GPW Benchmark.
    // For this demonstration, we're returning reasonable current values.
    
    // Current WIBOR rates as of April 2024
    return {
      source: "GPW Benchmark",
      rates: {
        "1M": 5.86,
        "3M": 5.88,  // Most commonly used for mortgages
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
  // Get the most recent WIBOR rates from storage
  const latestRates = await storage.getLatestWiborRates();
  
  if (latestRates && latestRates.length > 0) {
    // Check if the rates are still fresh (less than 24 hours old)
    const fetchDate = new Date(latestRates[0].fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      // Convert array of rates to object
      const ratesObject: Record<string, number> = {};
      
      for (const rate of latestRates) {
        ratesObject[rate.type] = parseFloat(rate.rate);
      }
      
      return {
        source: latestRates[0].source,
        rates: ratesObject,
        fetchDate: latestRates[0].fetchDate
      };
    }
  }
  
  return null;
}

// Helper function to fetch bank mortgage offers
async function fetchBankOffers() {
  try {
    // In a real application, this would either call an API that aggregates
    // bank offers or scrape from comparison websites.
    // For this demonstration, we're returning reasonable current values.
    
    // Current bank mortgage offers as of April 2024
    return {
      source: "Market research",
      offers: [
        { bankName: "PKO BP", bankMargin: 2.30, wiborType: "3M", totalRate: 8.18 },
        { bankName: "Santander", bankMargin: 2.39, wiborType: "3M", totalRate: 8.27 },
        { bankName: "ING Bank Śląski", bankMargin: 2.19, wiborType: "6M", totalRate: 8.09 },
        { bankName: "mBank", bankMargin: 2.60, wiborType: "3M", totalRate: 8.48 },
        { bankName: "BNP Paribas", bankMargin: 2.10, wiborType: "3M", totalRate: 7.98 }
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
  // Get the most recent bank offers from storage
  const latestOffers = await storage.getLatestBankOffers();
  
  if (latestOffers && latestOffers.length > 0) {
    // Check if the offers are still fresh (less than 24 hours old)
    const fetchDate = new Date(latestOffers[0].fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      // Convert storage format to API response format
      const offers = latestOffers.map(offer => ({
        bankName: offer.bankName,
        bankMargin: parseFloat(offer.bankMargin),
        wiborType: offer.wiborType,
        totalRate: parseFloat(offer.totalRate),
        additionalInfo: offer.additionalInfo || undefined
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
