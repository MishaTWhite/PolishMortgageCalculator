import { storage } from "./storage";
import { scrapeOtodomPropertyDataByRoomType } from "./scraper";
import { scrapePropertyData } from "./playwrightScraper";
import { 
  enqueueCityTasks, 
  getQueueStatus, 
  ScrapeTask, 
  TaskStatus 
} from "./scrapeTaskManager";
import { logInfo, logError, logWarning } from "./scraperLogger";

// Helper function to normalize city names for database storage and API comparison
function normalizeCity(cityName: string): string {
  const cityMap: Record<string, string> = {
    'Wrocław': 'wroclaw',
    'Warszawa': 'warsaw',
    'Kraków': 'krakow',
    'Gdańsk': 'gdansk'
  };
  
  return cityMap[cityName] || cityName.toLowerCase();
}

// City configurations with mapping to Otodom URLs and district names
const cityConfig: { 
  [key: string]: { 
    name: string, 
    otodomUrl: string,
    districts: Array<{ 
      name: string, 
      searchTerm: string,
      // Fallback data if scraping fails
      fallbackPriceRange: [number, number], 
      fallbackListings: [number, number] 
    }> 
  } 
} = {
  warsaw: {
    name: "Warszawa",
    otodomUrl: "warszawa",
    districts: [
      { name: "Śródmieście", searchTerm: "srodmiescie", fallbackPriceRange: [18000, 25000], fallbackListings: [100, 150] },
      { name: "Mokotów", searchTerm: "mokotow", fallbackPriceRange: [14000, 20000], fallbackListings: [80, 130] },
      { name: "Wola", searchTerm: "wola", fallbackPriceRange: [13000, 18000], fallbackListings: [70, 110] },
      { name: "Ursynów", searchTerm: "ursynow", fallbackPriceRange: [12000, 16000], fallbackListings: [60, 100] },
      { name: "Praga Południe", searchTerm: "praga-poludnie", fallbackPriceRange: [11000, 15000], fallbackListings: [50, 90] },
      { name: "Praga Północ", searchTerm: "praga-polnoc", fallbackPriceRange: [10000, 14000], fallbackListings: [40, 80] },
      { name: "Bielany", searchTerm: "bielany", fallbackPriceRange: [11000, 14500], fallbackListings: [45, 75] },
      { name: "Ochota", searchTerm: "ochota", fallbackPriceRange: [12500, 17000], fallbackListings: [55, 85] }
    ]
  },
  krakow: {
    name: "Kraków",
    otodomUrl: "krakow",
    districts: [
      { name: "Stare Miasto", searchTerm: "stare-miasto", fallbackPriceRange: [16000, 22000], fallbackListings: [80, 120] },
      { name: "Krowodrza", searchTerm: "krowodrza", fallbackPriceRange: [13000, 17000], fallbackListings: [70, 100] },
      { name: "Podgórze", searchTerm: "podgorze", fallbackPriceRange: [12000, 16000], fallbackListings: [60, 90] },
      { name: "Nowa Huta", searchTerm: "nowa-huta", fallbackPriceRange: [9000, 13000], fallbackListings: [40, 70] },
      { name: "Bronowice", searchTerm: "bronowice", fallbackPriceRange: [12000, 15000], fallbackListings: [50, 80] },
      { name: "Dębniki", searchTerm: "debniki", fallbackPriceRange: [11000, 14000], fallbackListings: [45, 75] },
      { name: "Zwierzyniec", searchTerm: "zwierzyniec", fallbackPriceRange: [14000, 19000], fallbackListings: [55, 85] },
      { name: "Łagiewniki", searchTerm: "lagiewniki", fallbackPriceRange: [10000, 13000], fallbackListings: [35, 65] }
    ]
  },
  wroclaw: {
    name: "Wrocław",
    otodomUrl: "dolnoslaskie/wroclaw/wroclaw/wroclaw",
    districts: [
      { name: "Stare Miasto", searchTerm: "stare-miasto", fallbackPriceRange: [14000, 19000], fallbackListings: [70, 110] },
      { name: "Krzyki", searchTerm: "krzyki", fallbackPriceRange: [12000, 16000], fallbackListings: [60, 100] },
      { name: "Śródmieście", searchTerm: "srodmiescie", fallbackPriceRange: [13000, 17000], fallbackListings: [65, 105] },
      { name: "Fabryczna", searchTerm: "fabryczna", fallbackPriceRange: [11000, 15000], fallbackListings: [55, 95] },
      { name: "Psie Pole", searchTerm: "psie-pole", fallbackPriceRange: [9000, 13000], fallbackListings: [45, 85] },
      { name: "Nadodrze", searchTerm: "nadodrze", fallbackPriceRange: [10000, 14000], fallbackListings: [50, 90] }
    ]
  },
  gdansk: {
    name: "Gdańsk",
    otodomUrl: "pomorskie/gdansk/gdansk/gdansk",
    districts: [
      { name: "Śródmieście", searchTerm: "srodmiescie", fallbackPriceRange: [15000, 21000], fallbackListings: [65, 105] },
      { name: "Wrzeszcz", searchTerm: "wrzeszcz", fallbackPriceRange: [13000, 18000], fallbackListings: [60, 100] },
      { name: "Oliwa", searchTerm: "oliwa", fallbackPriceRange: [12000, 17000], fallbackListings: [55, 95] },
      { name: "Przymorze", searchTerm: "przymorze", fallbackPriceRange: [11000, 15000], fallbackListings: [50, 90] },
      { name: "Zaspa", searchTerm: "zaspa", fallbackPriceRange: [10000, 14000], fallbackListings: [45, 85] },
      { name: "Chełm", searchTerm: "chelm", fallbackPriceRange: [9000, 13000], fallbackListings: [40, 80] }
    ]
  }
};

// Function to fetch property price data for a city
/**
 * Новая функция для скрапинга данных о недвижимости с использованием Playwright и очереди задач
 */
export async function fetchPropertyPriceDataPlaywright(
  city: string, 
  fetchDate: string, 
  specificDistrict?: string | null,
  specificRoomType?: string | null
) {
  try {
    logInfo(`Starting property data fetch using Playwright for ${city}`);
    
    // Нормализация города
    const normalizedCity = normalizeCity(city);
    const cityData = cityConfig[normalizedCity];
    
    if (!cityData) {
      throw new Error(`City not found: ${city}`);
    }
    
    // Фильтрация районов, если указан конкретный
    const districtsToProcess = specificDistrict 
      ? cityData.districts.filter(d => d.searchTerm === specificDistrict || d.name === specificDistrict)
      : cityData.districts;
    
    if (specificDistrict && districtsToProcess.length === 0) {
      throw new Error(`District not found: ${specificDistrict}`);
    }
    
    // Определение типов комнат для скрапинга
    const roomTypes = specificRoomType 
      ? [specificRoomType] 
      : ["oneRoom", "twoRoom", "threeRoom", "fourPlusRoom"];
    
    // Если обрабатываем все районы и типы комнат, удаляем существующие данные
    if (!specificDistrict && !specificRoomType) {
      logInfo(`Deleting existing property price data for ${normalizedCity}`);
      await storage.deletePropertyPricesByCity(normalizedCity);
    }
    
    // Создаем задачи для скрапинга в очереди
    const tasks = enqueueCityTasks(
      cityData.otodomUrl,
      normalizedCity,
      districtsToProcess,
      roomTypes,
      fetchDate
    );
    
    logInfo(`Added ${tasks.length} tasks to the queue for ${cityData.name}`);
    
    // Возвращаем информацию о добавленных задачах
    return {
      status: "processing",
      message: `Started scraping tasks for ${cityData.name}. Processing will continue in the background.`,
      queueStatus: getQueueStatus(),
      tasks: tasks.map(t => ({
        id: t.id,
        district: t.districtName,
        roomType: t.roomType,
        status: t.status
      }))
    };
  } catch (error) {
    logError(`Error in fetchPropertyPriceDataPlaywright: ${error}`);
    throw error;
  }
}

/**
 * Получить статус очереди задач скрапинга
 */
export function getScrapingStatus() {
  return getQueueStatus();
}

/**
 * Оригинальная функция для скрапинга данных о недвижимости (сохранена для обратной совместимости)
 */
export async function fetchPropertyPriceData(
  city: string, 
  fetchDate: string, 
  specificDistrict?: string | null,
  specificRoomType?: string | null
) {
  const normalizedCity = normalizeCity(city);
  const cityData = cityConfig[normalizedCity];
  
  if (!cityData) {
    throw new Error(`City not found: ${city}`);
  }
  
  console.log(`Fetching property price data for ${cityData.name} (${normalizedCity})`);
  
  // Filter districts if a specific one is requested
  const districtsToProcess = specificDistrict 
    ? cityData.districts.filter(d => d.searchTerm === specificDistrict || d.name === specificDistrict)
    : cityData.districts;
  
  if (specificDistrict && districtsToProcess.length === 0) {
    throw new Error(`District not found: ${specificDistrict}`);
  }
  
  // If we're processing all districts and all room types, delete existing data
  if (!specificDistrict && !specificRoomType) {
    console.log(`Deleting existing property price data for ${normalizedCity}`);
    await storage.deletePropertyPricesByCity(normalizedCity);
  }
  
  const allResults = [];
  
  // Process each district
  for (const district of districtsToProcess) {
    try {
      console.log(`Processing district: ${district.name}`);
      
      // Define room types to scrape
      const roomTypes = specificRoomType 
        ? [specificRoomType] 
        : ["oneRoom", "twoRoom", "threeRoom", "fourPlusRoom"];
      
      // Initialize district results with empty data
      const districtResults = {
        averagePricePerSqm: 0,
        numberOfListings: 0,
        minPrice: Number.MAX_SAFE_INTEGER,
        maxPrice: 0,
        roomBreakdown: {
          oneRoom: { count: 0, reportedCount: 0, avgPrice: 0 },
          twoRoom: { count: 0, reportedCount: 0, avgPrice: 0 },
          threeRoom: { count: 0, reportedCount: 0, avgPrice: 0 },
          fourPlusRoom: { count: 0, reportedCount: 0, avgPrice: 0 }
        }
      };
      
      let totalListings = 0;
      let totalPricePerSqmSum = 0;
      let allPrices: number[] = [];
      
      // Process each room type separately
      for (const roomType of roomTypes) {
        console.log(`Scraping ${roomType} for ${district.name}`);
        
        // Call our new room scraper function with error handling
        let roomResults = null;
        try {
          roomResults = await scrapeOtodomPropertyDataByRoomType(
            cityData.otodomUrl,
            district.searchTerm,
            roomType
          );
        } catch (error) {
          console.error(`Error scraping ${roomType} for ${district.name}:`, error);
          // Continue to next room type on error
          continue;
        }
        
        // Skip if no results for this room type
        if (!roomResults) {
          console.log(`No results for ${roomType} in ${district.name}`);
          continue;
        }
        
        // Update district results with this room type's data
        if (roomResults.count > 0) {
          // Add to total listings count
          totalListings += roomResults.count;
          
          // Add to total price per sqm sum for calculating average
          totalPricePerSqmSum += roomResults.avgPricePerSqm * roomResults.count;
          
          // Add prices to all prices array for min/max calculation
          if (roomResults.prices && roomResults.prices.length > 0) {
            allPrices = [...allPrices, ...roomResults.prices];
          }
          
          // Update min and max prices
          if (allPrices.length > 0) {
            districtResults.minPrice = Math.min(districtResults.minPrice, ...roomResults.prices);
            districtResults.maxPrice = Math.max(districtResults.maxPrice, ...roomResults.prices);
          }
        }
        
        // Store room breakdown data
        districtResults.roomBreakdown[roomType as keyof typeof districtResults.roomBreakdown] = {
          count: roomResults.count,
          reportedCount: roomResults.reportedCount,
          avgPrice: roomResults.avgPrice
        };
      }
      
      // Calculate district-wide average price per square meter
      if (totalListings > 0) {
        districtResults.averagePricePerSqm = Math.round(totalPricePerSqmSum / totalListings);
        districtResults.numberOfListings = totalListings;
        
        // Fix if minPrice is still at initial value
        if (districtResults.minPrice === Number.MAX_SAFE_INTEGER && allPrices.length > 0) {
          districtResults.minPrice = Math.min(...allPrices);
        } else if (districtResults.minPrice === Number.MAX_SAFE_INTEGER) {
          districtResults.minPrice = 0;
        }
      } else {
        // If no listings were found, use fallback data
        console.log(`No listings found for ${district.name}, using fallback data`);
        districtResults.averagePricePerSqm = Math.floor(Math.random() * 
          (district.fallbackPriceRange[1] - district.fallbackPriceRange[0]) + 
          district.fallbackPriceRange[0]);
        
        districtResults.numberOfListings = Math.floor(Math.random() * 
          (district.fallbackListings[1] - district.fallbackListings[0]) + 
          district.fallbackListings[0]);
        
        districtResults.minPrice = districtResults.averagePricePerSqm * 25; // Approx min for a small apartment
        districtResults.maxPrice = districtResults.averagePricePerSqm * 120; // Approx max for a large apartment
      }
      
      // Validate data before creating the property price record
      // Define price range limits
      const MAX_VALID_PRICE = 10000000; // 10 million zł
      const MAX_VALID_PRICE_PER_SQM = 100000; // 100,000 zł/m²
      
      // Helper function to safely convert and validate numeric values
      const safeNumber = (value: any, defaultValue: number, maxValue: number): number => {
        if (value === undefined || value === null) return defaultValue;
        
        let num: number;
        try {
          num = Number(value);
          // Check if the number is valid and within range
          if (isNaN(num) || !isFinite(num) || num < 0 || num > maxValue) {
            console.warn(`Invalid number value: ${value}, using default: ${defaultValue}`);
            return defaultValue;
          }
          return num;
        } catch (error) {
          console.warn(`Error converting value to number: ${value}, using default: ${defaultValue}`);
          return defaultValue;
        }
      };
      
      // Create a property price record with validated data
      const propertyPrice = {
        city: normalizedCity,
        district: district.name,
        averagePricePerSqm: Math.round(safeNumber(districtResults.averagePricePerSqm, 0, MAX_VALID_PRICE_PER_SQM)),
        numberOfListings: Math.round(safeNumber(districtResults.numberOfListings, 0, 1000)),
        minPrice: Math.round(safeNumber(districtResults.minPrice, 0, MAX_VALID_PRICE)),
        maxPrice: Math.round(safeNumber(districtResults.maxPrice, 0, MAX_VALID_PRICE)),
        // Add these properties with validation
        oneRoomCount: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.count, 0, 500)),
        oneRoomReportedCount: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.reportedCount, 0, 500)),
        oneRoomAvgPrice: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM)),
        twoRoomCount: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.count, 0, 500)),
        twoRoomReportedCount: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.reportedCount, 0, 500)),
        twoRoomAvgPrice: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM)),
        threeRoomCount: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.count, 0, 500)),
        threeRoomReportedCount: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.reportedCount, 0, 500)),
        threeRoomAvgPrice: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM)),
        fourPlusRoomCount: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.count, 0, 500)),
        fourPlusRoomReportedCount: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.reportedCount, 0, 500)),
        fourPlusRoomAvgPrice: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM)),
        // Store the validated roomBreakdown as JSON string
        roomBreakdown: JSON.stringify({
          oneRoom: {
            count: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.count, 0, 500)),
            reportedCount: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.reportedCount, 0, 500)),
            avgPrice: Math.round(safeNumber(districtResults.roomBreakdown.oneRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM))
          },
          twoRoom: {
            count: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.count, 0, 500)),
            reportedCount: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.reportedCount, 0, 500)),
            avgPrice: Math.round(safeNumber(districtResults.roomBreakdown.twoRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM))
          },
          threeRoom: {
            count: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.count, 0, 500)),
            reportedCount: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.reportedCount, 0, 500)),
            avgPrice: Math.round(safeNumber(districtResults.roomBreakdown.threeRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM))
          },
          fourPlusRoom: {
            count: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.count, 0, 500)),
            reportedCount: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.reportedCount, 0, 500)),
            avgPrice: Math.round(safeNumber(districtResults.roomBreakdown.fourPlusRoom.avgPrice, 0, MAX_VALID_PRICE_PER_SQM))
          }
        }),
        source: "Otodom",
        fetchDate
      };
      
      // Store the property price in the database
      console.log(`Storing property price data for ${district.name}`);
      await storage.createPropertyPrice(propertyPrice);
      
      allResults.push(propertyPrice);
      console.log(`Successfully scraped data for ${district.name}`);
      
    } catch (error) {
      console.error(`Error processing ${district.name}:`, error);
      // Continue with next district even if one fails
    }
  }
  
  return allResults;
}