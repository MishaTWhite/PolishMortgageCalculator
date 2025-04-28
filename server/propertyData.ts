import { storage } from "./storage";

// Helper function to generate sample property price data
export async function generateSamplePropertyData(city: string, fetchDate: string) {
  // Define configuration for each city
  const cityConfig: { [key: string]: { name: string, districts: Array<{ name: string, priceRange: [number, number], listings: [number, number] }> } } = {
    warsaw: {
      name: "Warszawa",
      districts: [
        { name: "Śródmieście", priceRange: [18000, 25000], listings: [100, 150] },
        { name: "Mokotów", priceRange: [14000, 20000], listings: [80, 130] },
        { name: "Wola", priceRange: [13000, 18000], listings: [70, 110] },
        { name: "Ursynów", priceRange: [12000, 16000], listings: [60, 100] },
        { name: "Praga Południe", priceRange: [11000, 15000], listings: [50, 90] },
        { name: "Praga Północ", priceRange: [10000, 14000], listings: [40, 80] },
        { name: "Bielany", priceRange: [11000, 14500], listings: [45, 75] },
        { name: "Ochota", priceRange: [12500, 17000], listings: [55, 85] }
      ]
    },
    krakow: {
      name: "Kraków",
      districts: [
        { name: "Stare Miasto", priceRange: [16000, 22000], listings: [80, 120] },
        { name: "Krowodrza", priceRange: [13000, 17000], listings: [70, 100] },
        { name: "Podgórze", priceRange: [11000, 15000], listings: [60, 90] },
        { name: "Nowa Huta", priceRange: [8000, 12000], listings: [40, 70] },
        { name: "Dębniki", priceRange: [12000, 16000], listings: [50, 85] },
        { name: "Łagiewniki", priceRange: [10000, 14000], listings: [45, 75] }
      ]
    },
    wroclaw: {
      name: "Wrocław",
      districts: [
        { name: "Stare Miasto", priceRange: [14000, 19000], listings: [70, 110] },
        { name: "Krzyki", priceRange: [11000, 15000], listings: [60, 90] },
        { name: "Fabryczna", priceRange: [9500, 13500], listings: [50, 80] },
        { name: "Psie Pole", priceRange: [8500, 12000], listings: [40, 70] },
        { name: "Śródmieście", priceRange: [12000, 16000], listings: [55, 85] }
      ]
    },
    gdansk: {
      name: "Gdańsk",
      districts: [
        { name: "Śródmieście", priceRange: [13000, 18000], listings: [60, 100] },
        { name: "Wrzeszcz", priceRange: [11000, 15000], listings: [55, 85] },
        { name: "Oliwa", priceRange: [10000, 14000], listings: [45, 75] },
        { name: "Przymorze", priceRange: [9000, 13000], listings: [40, 70] },
        { name: "Zaspa", priceRange: [8500, 12500], listings: [35, 65] }
      ]
    }
  };

  // Get config for requested city or default to Warsaw
  const config = cityConfig[city.toLowerCase()] || cityConfig.warsaw;
  
  // Generate random data for each district within the configured ranges
  const prices = config.districts.map(district => {
    // Generate random average price within the range
    const avgPrice = Math.floor(
      district.priceRange[0] + 
      Math.random() * (district.priceRange[1] - district.priceRange[0])
    );
    
    // Generate random number of listings within the range
    const listings = Math.floor(
      district.listings[0] + 
      Math.random() * (district.listings[1] - district.listings[0])
    );
    
    // Generate min and max prices around the average (±20%)
    const minPrice = Math.floor(avgPrice * 0.8) * 10000;  // Convert to actual property price
    const maxPrice = Math.floor(avgPrice * 1.2) * 10000;  // Convert to actual property price
    
    // Create and store the district data
    const districtData = {
      city: config.name,
      district: district.name,
      averagePricePerSqm: avgPrice,
      numberOfListings: listings,
      minPrice,
      maxPrice,
      source: "Otodom",
      fetchDate
    };
    
    // Store in database
    storage.createPropertyPrice(districtData);
    
    return {
      district: district.name,
      averagePricePerSqm: avgPrice,
      numberOfListings: listings,
      minPrice,
      maxPrice
    };
  });
  
  // Return the combined data
  return {
    city: config.name,
    prices,
    lastUpdated: fetchDate,
    source: "Otodom"
  };
}