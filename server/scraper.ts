import axios from "axios";
import * as cheerio from "cheerio";

// Function to scrape property data from Otodom for a specific room type
export async function scrapeOtodomPropertyDataByRoomType(
  cityUrl: string, 
  districtSearchTerm: string,
  roomType: string
): Promise<{
  count: number;
  reportedCount: number;
  avgPrice: number;
  avgPricePerSqm: number;
  prices: number[];
  pricesPerSqm: number[];
} | null> {
  try {
    console.log(`Starting scrape for ${roomType} in ${cityUrl}/${districtSearchTerm}`);
    
    // Base URL for Otodom
    const baseUrl = `https://www.otodom.pl/pl/wyniki/sprzedaz/mieszkanie/all/${cityUrl}/${cityUrl}/${districtSearchTerm}`;
    
    // Headers to make request look like it's coming from a browser
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Referer': 'https://www.otodom.pl/',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0'
    };
    
    // Map room type to query parameter
    const roomQueries: Record<string, string> = {
      oneRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BONE%5D&by=DEFAULT&direction=DESC&viewType=listing",
      twoRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BTWO%5D&by=DEFAULT&direction=DESC&viewType=listing",
      threeRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BTHREE%5D&by=DEFAULT&direction=DESC&viewType=listing",
      fourPlusRoom: "?limit=72&ownerTypeSingleSelect=ALL&roomsNumber=%5BFOUR%5D&by=DEFAULT&direction=DESC&viewType=listing"
    };
    
    // Check if room type is valid
    if (!roomQueries[roomType]) {
      throw new Error(`Invalid room type: ${roomType}`);
    }
    
    // Create URL for this room type
    const roomUrl = `${baseUrl}${roomQueries[roomType]}`;
    console.log(`Requesting URL: ${roomUrl}`);
    
    // Variables to collect data
    let reportedCount = 0;
    let processedCount = 0;
    let totalPrice = 0;
    let totalPricePerSqm = 0;
    const prices: number[] = [];
    const pricesPerSqm: number[] = [];
    
    // Get first page to check total listings and pagination
    const firstResponse = await axios.get(roomUrl, { headers });
    const firstHtml = firstResponse.data;
    const $ = cheerio.load(firstHtml);
    
    // Extract the reported number of listings (what Otodom claims exists)
    const listingsText = $('div[data-cy="search.listing-panel.label.ads-number"]').text() || 
                        $('h1:contains("ogłosz")').text() || 
                        $('h3:contains("ogłosz")').text() || 
                        $('span:contains("ogłosz")').text() || 
                        $('div:contains("ogłosz")').first().text();
    
    let regexMatch = listingsText.match(/(\d+)\s+ogłosz/i) || 
                    listingsText.match(/znaleziono\s+(\d+)/i) || 
                    listingsText.match(/(\d+)\s+ofert/i) || 
                    listingsText.match(/(\d+)\s+mieszk/i) ||
                    listingsText.match(/(\d+)/);
                        
    if (regexMatch) {
      reportedCount = parseInt(regexMatch[1], 10);
      console.log(`Otodom reports ${reportedCount} listings for ${roomType}`);
    } else {
      console.log(`No listings found for ${roomType}`);
      return null; // Return null if no listings found
    }
    
    // Scrape data from first page
    const propertyItems = $('article') || $('.css-1q7njkh') || $('.css-1oji9jw') || $('.css-1hfoviz') || $('.offer-item');
    console.log(`Found ${propertyItems.length} property items on first page`);
    
    // Process listings from the first page
    propertyItems.each((_, element) => {
      try {
        // Extract price and area
        const priceText = $(element).find('p:contains("zł")').text() || 
                          $(element).find('.css-1323u5x').text() || 
                          $(element).find('.offer-item-price').text();
        
        const areaText = $(element).find('p:contains("m²")').text() || 
                         $(element).find('.css-1itfubx').text() || 
                         $(element).find('.offer-item-area').text();
        
        console.log(`Found listing for ${roomType}: Price=${priceText}, Area=${areaText}`);
        
        if (priceText && areaText) {
          // Parse price - convert "1 234 567 zł" to 1234567
          const price = parseInt(priceText.replace(/\s+/g, '').replace(/[^\d]/g, ''), 10);
          
          // Parse area - convert "123,45 m²" to 123.45
          const area = parseFloat(areaText.replace(/\s+/g, '').replace(/m²/g, '').replace(',', '.'));
          
          if (!isNaN(price) && !isNaN(area) && area > 0) {
            const pricePerSqm = Math.round(price / area);
            console.log(`Successfully parsed for ${roomType}: price=${price}, area=${area}, price/m²=${pricePerSqm}`);
            
            prices.push(price);
            pricesPerSqm.push(pricePerSqm);
            totalPrice += price;
            totalPricePerSqm += pricePerSqm;
            processedCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing a listing: ${error}`);
      }
    });
    
    // Find pagination to determine if we need to fetch more pages
    let maxPages = 1;
    
    // Try multiple pagination selectors, Otodom changes their markup periodically
    const paginationSelectors = [
      'li[data-cy^="pagination.page-"]',
      'button[data-cy^="pagination.page-"]',
      'a[data-cy^="pagination.page-"]',
      '.pagination a',
      '.pagination li',
      '.pagination button',
      'ul.pagination li',
      'ul.pagination a',
      'nav ul li a[href*="page="]',
      'a[href*="page="]',
      '.css-1m75adt', // Specific Otodom class for pagination
      '.css-1oy3hhb', // Another specific Otodom class
      'div[data-cy="pagination.next-page"]', // Next page button
      'div[data-cy^="pagination"]',
      'nav[aria-label="pagination"]',
      'nav ul li'
    ];
    
    let paginationElements = null;
    
    // Try each pagination selector until we find something
    for (const selector of paginationSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found pagination elements using selector: ${selector}`);
        paginationElements = elements;
        break;
      }
    }
    
    if (paginationElements && paginationElements.length > 0) {
      console.log(`Found ${paginationElements.length} pagination elements`);
      
      // Try to determine last page number from pagination
      // Method 1: Using data-cy attribute
      const lastPageElement = paginationElements.last();
      const dataCyValue = lastPageElement.attr('data-cy');
      
      if (dataCyValue && dataCyValue.includes('page-')) {
        const pageNumber = dataCyValue.replace('pagination.page-', '');
        if (!isNaN(parseInt(pageNumber, 10))) {
          maxPages = parseInt(pageNumber, 10);
        }
      } 
      // Method 2: Using text content of pagination
      else {
        // Look for the highest number in pagination elements
        paginationElements.each((_, el) => {
          const text = $(el).text().trim();
          const numberMatch = text.match(/\d+/);
          if (numberMatch) {
            const pageNum = parseInt(numberMatch[0], 10);
            if (!isNaN(pageNum) && pageNum > maxPages) {
              maxPages = pageNum;
            }
          }
        });
      }
      
      // Method 3: Check for href attributes with page parameters
      paginationElements.each((_, el) => {
        const href = $(el).attr('href');
        if (href && href.includes('page=')) {
          const pageMatch = href.match(/page=(\d+)/);
          if (pageMatch && pageMatch[1]) {
            const pageNum = parseInt(pageMatch[1], 10);
            if (!isNaN(pageNum) && pageNum > maxPages) {
              maxPages = pageNum;
            }
          }
        }
      });
    }
    
    // If still no pagination detected, check if reportedCount suggests multiple pages
    if (maxPages === 1 && reportedCount > 70) {
      const estimatedPages = Math.ceil(reportedCount / 70);
      console.log(`No pagination detected, but reportedCount ${reportedCount} suggests ~${estimatedPages} pages`);
      // Try at least a few pages even without detected pagination
      maxPages = Math.min(5, estimatedPages);
    }
    
    console.log(`Found ${maxPages} pages for ${roomType}`);
    
    // Fetch and process additional pages
    // Limit to 30 pages max to avoid excessive requests
    const pagesToScrape = Math.min(maxPages, 30);
    
    // Process additional pages
    for (let page = 2; page <= pagesToScrape; page++) {
      try {
        // Add a delay between requests
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const pageUrl = `${roomUrl}&page=${page}`;
        console.log(`Scraping page ${page}/${pagesToScrape} for ${roomType}: ${pageUrl}`);
        
        const response = await axios.get(pageUrl, { headers });
        const html = response.data;
        const $page = cheerio.load(html);
        
        // Process listings on this page
        const pageItems = $page('article') || $page('.css-1q7njkh') || $page('.css-1oji9jw') || $page('.css-1hfoviz') || $page('.offer-item');
        console.log(`Found ${pageItems.length} property items on page ${page}`);
        
        pageItems.each((_, element) => {
          try {
            // Extract price and area
            const priceText = $page(element).find('p:contains("zł")').text() || 
                              $page(element).find('.css-1323u5x').text() || 
                              $page(element).find('.offer-item-price').text();
            
            const areaText = $page(element).find('p:contains("m²")').text() || 
                             $page(element).find('.css-1itfubx').text() || 
                             $page(element).find('.offer-item-area').text();
            
            console.log(`Found listing on page ${page}: Price=${priceText}, Area=${areaText}`);
            
            if (priceText && areaText) {
              // Parse price
              const price = parseInt(priceText.replace(/\s+/g, '').replace(/[^\d]/g, ''), 10);
              
              // Parse area
              const area = parseFloat(areaText.replace(/\s+/g, '').replace(/m²/g, '').replace(',', '.'));
              
              if (!isNaN(price) && !isNaN(area) && area > 0) {
                const pricePerSqm = Math.round(price / area);
                console.log(`Successfully parsed: price=${price}, area=${area}, price/m²=${pricePerSqm}`);
                
                prices.push(price);
                pricesPerSqm.push(pricePerSqm);
                totalPrice += price;
                totalPricePerSqm += pricePerSqm;
                processedCount++;
              }
            }
          } catch (error) {
            console.error(`Error processing a listing on page ${page}: ${error}`);
          }
        });
        
      } catch (error) {
        console.error(`Error fetching page ${page} for ${roomType}:`, error);
        // Break out of the loop if we encounter an error
        break;
      }
    }
    
    // Calculate average prices
    const avgPrice = processedCount > 0 ? Math.round(totalPrice / processedCount) : 0;
    const avgPricePerSqm = processedCount > 0 ? Math.round(totalPricePerSqm / processedCount) : 0;
    
    console.log(`Completed scraping for ${roomType}: ${processedCount} listings processed`);
    console.log(`Average price: ${avgPrice} zł, Average price per m²: ${avgPricePerSqm} zł`);
    
    // Return the results
    return {
      count: processedCount,
      reportedCount,
      avgPrice,
      avgPricePerSqm,
      prices,
      pricesPerSqm
    };
    
  } catch (error) {
    console.error(`Error scraping data for ${roomType} in ${districtSearchTerm}:`, error);
    return null;
  }
}