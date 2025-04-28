import axios from "axios";
import * as cheerio from "cheerio";

// Function to scrape property data from Otodom for a specific room type
// Function to generate a random IP address from the specified country
function generateRandomPolishIP(): string {
  // Polish IP ranges (simplified example)
  const polishRanges = [
    { start: '5.172.0.0', end: '5.172.255.255' },
    { start: '31.0.0.0', end: '31.63.255.255' },
    { start: '46.48.0.0', end: '46.48.255.255' },
    { start: '77.252.0.0', end: '77.255.255.255' },
    { start: '83.0.0.0', end: '83.31.255.255' },
    { start: '89.64.0.0', end: '89.79.255.255' },
    { start: '91.192.0.0', end: '91.223.255.255' }
  ];
  
  // Select a random range
  const range = polishRanges[Math.floor(Math.random() * polishRanges.length)];
  
  // Convert IP to number for easier manipulation
  const startParts = range.start.split('.').map(Number);
  const endParts = range.end.split('.').map(Number);
  
  // Generate a random IP within the range
  const ipParts = [];
  for (let i = 0; i < 4; i++) {
    ipParts.push(Math.floor(Math.random() * (endParts[i] - startParts[i] + 1) + startParts[i]));
  }
  
  return ipParts.join('.');
}

// Generate realistic browsing pattern by visiting the main page first,
// then category page, then search results
async function simulateRealBrowsing(headers: Record<string, string>) {
  try {
    // Visit homepage first (like a real user would)
    console.log('Simulating real user: Visiting Otodom homepage...');
    await axios.get('https://www.otodom.pl/', { headers });
    
    // Random delay between actions (1-3 seconds)
    const delay1 = 1000 + Math.floor(Math.random() * 2000);
    await new Promise(resolve => setTimeout(resolve, delay1));
    
    // Visit the sales category page
    console.log('Simulating real user: Visiting sales category page...');
    await axios.get('https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie', { headers });
    
    // Random delay between actions (2-4 seconds)
    const delay2 = 2000 + Math.floor(Math.random() * 2000);
    await new Promise(resolve => setTimeout(resolve, delay2));
    
    return true;
  } catch (error) {
    console.error('Error during browsing simulation:', error);
    return false;
  }
}

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
    
    // Base URL for Otodom - trying several URL formats as Otodom may have different URL structures
    // Multiple URL patterns to try in case one doesn't work
    const urlPatterns = [
      // Pattern 1: Current format with region/city/district (used since ~2023)
      `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${cityUrl}/${districtSearchTerm}`,
      // Pattern 2: Alternative format without region in path
      `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie/${districtSearchTerm}`,
      // Pattern 3: Direct city search using the location parameter
      `https://www.otodom.pl/pl/oferty/sprzedaz/mieszkanie?locations[]=${cityUrl}-${districtSearchTerm}`,
      // Pattern 4: Legacy format (pre-2023)
      `https://www.otodom.pl/sprzedaz/mieszkanie/${cityUrl}/${districtSearchTerm}`
    ];
    
    // Use the first pattern by default, we'll try others if this fails
    const baseUrl = urlPatterns[0];
    console.log(`Starting with URL pattern: ${baseUrl}`);
    
    // Using mobile user agent as mobile sites might have simpler anti-scraping protections
    // Pretending to be an iPhone user visiting from Poland
    const userAgents = [
      // Mobile User Agents
      'Mozilla/5.0 (iPhone; CPU iPhone OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 12; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Mobile Safari/537.36',
      // Desktop User Agents
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
    ];
    
    // Randomly select a user agent
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    
    // Headers to make request look like it's coming from a real browser
    const headers: Record<string, string> = {
      'User-Agent': randomUserAgent,
      'Accept-Language': 'pl-PL,pl;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Referer': 'https://www.otodom.pl/',
      'Connection': 'keep-alive',
      'Cache-Control': 'max-age=0',
      'sec-ch-ua': '"Google Chrome";v="113", "Chromium";v="113", "Not-A.Brand";v="24"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Cookie': 'lang=pl; zgoda=1; observed-listings=%5B%5D; observed-listings-extended=%5B%5D; laquesis=; laquesisff=; _ga=GA1.2.1954147678.1682352348'
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
    
    // Try each URL pattern until one works
    let roomUrl;
    let response;
    let success = false;
    
    for (let i = 0; i < urlPatterns.length; i++) {
      try {
        const currentUrl = `${urlPatterns[i]}${roomQueries[roomType]}`;
        console.log(`Trying URL pattern ${i+1}: ${currentUrl}`);
        
        // Simulate real browsing behavior before making the actual request
        await simulateRealBrowsing(headers);
        
        // Add random X-Forwarded-For to simulate request coming from a random Polish IP
        const randomPolishIP = generateRandomPolishIP();
        headers['X-Forwarded-For'] = randomPolishIP;
        console.log(`Using random Polish IP: ${randomPolishIP}`);
        
        // Test request with a 10 second timeout to quickly move to next pattern if this one fails
        response = await axios.get(currentUrl, { 
          headers, 
          timeout: 10000,
          maxRedirects: 5
        });
        
        // Check if we got a valid response
        if (response.status === 200 && response.data.includes('<article') || 
            response.data.includes('data-cy="search.listing"')) {
          console.log(`URL pattern ${i+1} works!`);
          roomUrl = currentUrl;
          success = true;
          break;
        } else {
          console.log(`URL pattern ${i+1} returned status ${response.status} but no listings found`);
        }
      } catch (error) {
        console.error(`URL pattern ${i+1} failed:`, error.message);
        // Continue with the next pattern
      }
    }
    
    if (!success) {
      console.error('All URL patterns failed, using default pattern');
      roomUrl = `${baseUrl}${roomQueries[roomType]}`;
    }
    console.log(`Requesting URL: ${roomUrl}`);
    
    // Variables to collect data
    let reportedCount = 0;
    let processedCount = 0;
    let totalPrice = 0;
    let totalPricePerSqm = 0;
    const prices: number[] = [];
    const pricesPerSqm: number[] = [];
    
    // Simulate real browsing behavior before making the actual request
    console.log('Simulating real user browsing behavior...');
    await simulateRealBrowsing(headers);
    
    // Add random X-Forwarded-For to simulate request coming from a random Polish IP
    // This header is often used by proxies and can help bypass geographical restrictions
    const randomPolishIP = generateRandomPolishIP();
    headers['X-Forwarded-For'] = randomPolishIP;
    console.log(`Using random Polish IP: ${randomPolishIP}`);
    
    // Get first page to check total listings and pagination
    console.log(`Now accessing the actual search results: ${roomUrl}`);
    
    // Use the response we already have if it exists from our URL testing
    let firstResponse;
    if (response && success) {
      console.log('Reusing response from URL testing');
      firstResponse = response;
    } else {
      firstResponse = await axios.get(roomUrl, { 
        headers,
        timeout: 30000, // 30 second timeout
        maxRedirects: 5 // Allow up to 5 redirects
      });
    }
    const firstHtml = firstResponse.data;
    const $ = cheerio.load(firstHtml);
    
    // Log the HTML title to see if we're getting a real page or an error page
    console.log(`Page title: ${$('title').text()}`);
    
    // Extract the reported number of listings (what Otodom claims exists)
    // Try multiple selectors to find the count text
    const listingsText = $('div[data-cy="search.listing-panel.label.ads-number"]').text() || 
                        $('h1:contains("ogłosz")').text() || 
                        $('h3:contains("ogłosz")').text() || 
                        $('span:contains("ogłosz")').text() || 
                        $('div:contains("ogłosz")').first().text() ||
                        $('span:contains("nieruchomości")').text() ||
                        $('div:contains("nieruchomości")').first().text() ||
                        $('[data-cy="search.listing-panel.label.ads-number"]').text() ||
                        $('h1').text(); // Last resort: grab the h1 text as it might contain the count
    
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
    
    // Log the HTML structure for debugging
    console.log(`HTML structure sample (first 500 chars): ${firstHtml.substring(0, 500)}`);
    
    // Check for the presence of specific elements to understand the page structure
    console.log(`Body tag exists: ${$('body').length > 0}`);
    console.log(`Html tag exists: ${$('html').length > 0}`);
    console.log(`Article tags count: ${$('article').length}`);
    console.log(`Divs count: ${$('div').length}`);
    
    // Try multiple selectors for property items, as Otodom changes selectors frequently
    // Note: In Cheerio, we need to explicitly select items, as the || operator doesn't work the same as in jQuery
    let propertyItems;
    
    if ($('article').length > 0) {
      propertyItems = $('article');
      console.log('Found listings using article selector');
    } else if ($('[data-cy="search.listing"]').length > 0) {
      propertyItems = $('[data-cy="search.listing"]');
      console.log('Found listings using data-cy="search.listing" selector');
    } else if ($('[data-cy^="listing-item"]').length > 0) {
      propertyItems = $('[data-cy^="listing-item"]');
      console.log('Found listings using data-cy^="listing-item" selector');
    } else if ($('[data-testid="listing-item"]').length > 0) {
      propertyItems = $('[data-testid="listing-item"]');
      console.log('Found listings using data-testid="listing-item" selector');
    } else if ($('.listing-item').length > 0) {
      propertyItems = $('.listing-item');
      console.log('Found listings using .listing-item selector');
    } else if ($('div[data-cy^="search.listing"]').length > 0) {
      propertyItems = $('div[data-cy^="search.listing"]'); 
      console.log('Found listings using div[data-cy^="search.listing"] selector');
    } else if ($('.css-1q7njkh').length > 0) {
      propertyItems = $('.css-1q7njkh');
      console.log('Found listings using .css-1q7njkh selector');
    } else if ($('.css-1oji9jw').length > 0) {
      propertyItems = $('.css-1oji9jw');
      console.log('Found listings using .css-1oji9jw selector');
    } else {
      // If no listing container is found, try to find any div containing price and area information
      console.log('No standard listing containers found, trying generic selectors');
      propertyItems = $('div:has(p:contains("zł"))');
      if (propertyItems.length === 0) {
        propertyItems = $('div:has(span:contains("zł"))');
      }
    }
    console.log(`Found ${propertyItems.length} property items on first page`);
    
    // Process listings from the first page
    propertyItems.each((_, element) => {
      try {
        // Extract price and area using multiple selector strategies
        // First, try the most common selectors
        let priceText = $(element).find('p:contains("zł")').text();
        let areaText = $(element).find('p:contains("m²")').text();
        
        // If not found, try specific class selectors that Otodom has used in the past
        if (!priceText) {
          priceText = $(element).find('.css-1323u5x').text() || 
                     $(element).find('.offer-item-price').text();
        }
        
        if (!areaText) {
          areaText = $(element).find('.css-1itfubx').text() || 
                    $(element).find('.offer-item-area').text();
        }
        
        // If still not found, try more generic approaches
        if (!priceText) {
          // Look for any element containing price indicators
          priceText = $(element).find('*:contains("zł")').first().text() ||
                     $(element).find('*:contains("PLN")').first().text();
        }
        
        if (!areaText) {
          // Look for any element containing area indicators
          areaText = $(element).find('*:contains("m²")').first().text() ||
                    $(element).find('*:contains("mkw")').first().text();
        }
        
        // Log all text in the element if we still can't find what we need
        if (!priceText || !areaText) {
          const allText = $(element).text().trim();
          console.log(`Full listing text: ${allText.substring(0, 200)}...`);
          
          // Try to extract numbers followed by currency symbol from full text
          const priceMatch = allText.match(/(\d[\d\s]*[\d])\s*zł/i);
          const areaMatch = allText.match(/(\d[\d\s,.]*[\d])\s*m²/i);
          
          if (priceMatch && !priceText) {
            priceText = priceMatch[0];
            console.log(`Extracted price from full text: ${priceText}`);
          }
          
          if (areaMatch && !areaText) {
            areaText = areaMatch[0];
            console.log(`Extracted area from full text: ${areaText}`);
          }
        }
        
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
      // Common Otodom pagination selectors (from Chrome DevTools inspection)
      'li[data-cy^="pagination.page-"]',
      'button[data-cy^="pagination.page-"]',
      'a[data-cy^="pagination.page-"]',
      'nav button',
      'nav a[href*="page="]',
      '[data-cy^="pagination.page-"]',
      '[data-testid="pagination.next-page"]',
      '[data-testid="pagination.page-"]',
      'span[data-cy="pagination.page-text"]',
      // General selectors
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
      'nav ul li',
      // Investigating page content to better understand structure
      'footer', // If we can find the footer, we can at least confirm the page loaded
      'html',
      'body'
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
        // Add a variable delay between requests to appear more human-like
        const delay = 2000 + Math.floor(Math.random() * 3000); // Random delay between 2-5 seconds
        console.log(`Waiting ${delay}ms before next request...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const pageUrl = `${roomUrl}&page=${page}`;
        console.log(`Scraping page ${page}/${pagesToScrape} for ${roomType}: ${pageUrl}`);
        
        // Generate a new random Polish IP for each page request to avoid pattern detection
        headers['X-Forwarded-For'] = generateRandomPolishIP();
        
        // Add a small variance to the user agent occasionally to appear more realistic
        if (Math.random() > 0.8) {
          headers['User-Agent'] = userAgents[Math.floor(Math.random() * userAgents.length)];
          console.log(`Changed user agent for page ${page}`);
        }
        
        const response = await axios.get(pageUrl, { 
          headers,
          timeout: 30000,
          maxRedirects: 5
        });
        const html = response.data;
        const $page = cheerio.load(html);
        
        // Try multiple selectors for property items on pagination pages
        let pageItems;
        
        if ($page('article').length > 0) {
          pageItems = $page('article');
          console.log(`Found listings on page ${page} using article selector`);
        } else if ($page('[data-cy="search.listing"]').length > 0) {
          pageItems = $page('[data-cy="search.listing"]');
          console.log(`Found listings on page ${page} using data-cy="search.listing" selector`);
        } else if ($page('[data-cy^="listing-item"]').length > 0) {
          pageItems = $page('[data-cy^="listing-item"]');
          console.log(`Found listings on page ${page} using data-cy^="listing-item" selector`);
        } else if ($page('[data-testid="listing-item"]').length > 0) {
          pageItems = $page('[data-testid="listing-item"]');
          console.log(`Found listings on page ${page} using data-testid="listing-item" selector`);
        } else if ($page('.listing-item').length > 0) {
          pageItems = $page('.listing-item');
          console.log(`Found listings on page ${page} using .listing-item selector`);
        } else if ($page('div[data-cy^="search.listing"]').length > 0) {
          pageItems = $page('div[data-cy^="search.listing"]'); 
          console.log(`Found listings on page ${page} using div[data-cy^="search.listing"] selector`);
        } else if ($page('.css-1q7njkh').length > 0) {
          pageItems = $page('.css-1q7njkh');
          console.log(`Found listings on page ${page} using .css-1q7njkh selector`);
        } else if ($page('.css-1oji9jw').length > 0) {
          pageItems = $page('.css-1oji9jw');
          console.log(`Found listings on page ${page} using .css-1oji9jw selector`);
        } else {
          // If no listing container is found, try to find any div containing price and area information
          console.log(`No standard listing containers found on page ${page}, trying generic selectors`);
          pageItems = $page('div:has(p:contains("zł"))');
          if (pageItems.length === 0) {
            pageItems = $page('div:has(span:contains("zł"))');
          }
        }
        console.log(`Found ${pageItems.length} property items on page ${page}`);
        
        pageItems.each((_, element) => {
          try {
            // Extract price and area using multiple selector strategies
            // First, try the most common selectors
            let priceText = $page(element).find('p:contains("zł")').text();
            let areaText = $page(element).find('p:contains("m²")').text();
            
            // If not found, try specific class selectors that Otodom has used in the past
            if (!priceText) {
              priceText = $page(element).find('.css-1323u5x').text() || 
                         $page(element).find('.offer-item-price').text();
            }
            
            if (!areaText) {
              areaText = $page(element).find('.css-1itfubx').text() || 
                        $page(element).find('.offer-item-area').text();
            }
            
            // If still not found, try more generic approaches
            if (!priceText) {
              // Look for any element containing price indicators
              priceText = $page(element).find('*:contains("zł")').first().text() ||
                         $page(element).find('*:contains("PLN")').first().text();
            }
            
            if (!areaText) {
              // Look for any element containing area indicators
              areaText = $page(element).find('*:contains("m²")').first().text() ||
                        $page(element).find('*:contains("mkw")').first().text();
            }
            
            // Log all text in the element if we still can't find what we need
            if (!priceText || !areaText) {
              const allText = $page(element).text().trim();
              console.log(`Full listing text on page ${page}: ${allText.substring(0, 200)}...`);
              
              // Try to extract numbers followed by currency symbol from full text
              const priceMatch = allText.match(/(\d[\d\s]*[\d])\s*zł/i);
              const areaMatch = allText.match(/(\d[\d\s,.]*[\d])\s*m²/i);
              
              if (priceMatch && !priceText) {
                priceText = priceMatch[0];
                console.log(`Extracted price from full text on page ${page}: ${priceText}`);
              }
              
              if (areaMatch && !areaText) {
                areaText = areaMatch[0];
                console.log(`Extracted area from full text on page ${page}: ${areaText}`);
              }
            }
            
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