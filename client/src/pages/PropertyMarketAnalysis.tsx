import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import LanguageSelector from "@/components/LanguageSelector";
import CalcNavigation from "@/components/CalcNavigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Building, Home, MapPin, Bed, Layers, Box } from "lucide-react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Define interfaces for property data
import { PropertyPriceResponse } from "@shared/schema";

// Room breakdown interface
interface RoomBreakdown {
  count: number;
  avgPrice: number;
}

interface PropertyPrice {
  district: string;
  averagePricePerSqm: number;
  numberOfListings: number;
  minPrice: number;
  maxPrice: number;
  roomBreakdown?: {
    oneRoom: RoomBreakdown;
    twoRoom: RoomBreakdown;
    threeRoom: RoomBreakdown;
    fourPlusRoom: RoomBreakdown;
  };
}

// Use the response type from the schema
type CityPrices = PropertyPriceResponse;

export default function PropertyMarketAnalysis() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for selected city and loading state
  const [selectedCity, setSelectedCity] = useState("warsaw");
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch property prices data
  const {
    data: propertyData,
    isLoading: isQueryLoading,
    isError,
    refetch
  } = useQuery<PropertyPriceResponse>({
    queryKey: ['/api/property-prices', selectedCity],
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    queryFn: async () => {
      // Make explicit query with the selected city parameter
      const response = await fetch(`/api/property-prices?city=${selectedCity}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    }
  });
  
  // Combine both loading states
  const isPageLoading = isLoading || isQueryLoading;
  
  // Function to format prices in PLN
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      maximumFractionDigits: 0
    }).format(price);
  };
  
  // Calculate city average
  const calculateCityAverage = (prices: PropertyPrice[] | undefined): number => {
    if (!prices || prices.length === 0) return 0;
    
    let totalPriceSum = 0;
    let totalListings = 0;
    
    prices.forEach(district => {
      totalPriceSum += district.averagePricePerSqm * district.numberOfListings;
      totalListings += district.numberOfListings;
    });
    
    return totalListings > 0 ? Math.round(totalPriceSum / totalListings) : 0;
  };
  
  const cityAverage = calculateCityAverage(propertyData?.prices);
  
  // Calculate city statistics by room type
  const calculateRoomTypeStats = (prices: PropertyPrice[] | undefined) => {
    if (!prices || prices.length === 0) {
      return {
        oneRoom: { count: 0, avgPrice: 0 },
        twoRoom: { count: 0, avgPrice: 0 },
        threeRoom: { count: 0, avgPrice: 0 },
        fourPlusRoom: { count: 0, avgPrice: 0 }
      };
    }
    
    // Initialize counters and sums
    let oneRoomCount = 0, oneRoomTotalPrice = 0;
    let twoRoomCount = 0, twoRoomTotalPrice = 0;
    let threeRoomCount = 0, threeRoomTotalPrice = 0;
    let fourPlusRoomCount = 0, fourPlusRoomTotalPrice = 0;
    
    // Process each district's room data
    prices.forEach(district => {
      if (district.roomBreakdown) {
        // One-room apartments
        oneRoomCount += district.roomBreakdown.oneRoom.count;
        oneRoomTotalPrice += district.roomBreakdown.oneRoom.count * district.roomBreakdown.oneRoom.avgPrice;
        
        // Two-room apartments
        twoRoomCount += district.roomBreakdown.twoRoom.count;
        twoRoomTotalPrice += district.roomBreakdown.twoRoom.count * district.roomBreakdown.twoRoom.avgPrice;
        
        // Three-room apartments
        threeRoomCount += district.roomBreakdown.threeRoom.count;
        threeRoomTotalPrice += district.roomBreakdown.threeRoom.count * district.roomBreakdown.threeRoom.avgPrice;
        
        // Four-plus-room apartments
        fourPlusRoomCount += district.roomBreakdown.fourPlusRoom.count;
        fourPlusRoomTotalPrice += district.roomBreakdown.fourPlusRoom.count * district.roomBreakdown.fourPlusRoom.avgPrice;
      }
    });
    
    // Calculate averages
    return {
      oneRoom: {
        count: oneRoomCount,
        avgPrice: oneRoomCount > 0 ? Math.round(oneRoomTotalPrice / oneRoomCount) : 0
      },
      twoRoom: {
        count: twoRoomCount,
        avgPrice: twoRoomCount > 0 ? Math.round(twoRoomTotalPrice / twoRoomCount) : 0
      },
      threeRoom: {
        count: threeRoomCount,
        avgPrice: threeRoomCount > 0 ? Math.round(threeRoomTotalPrice / threeRoomCount) : 0
      },
      fourPlusRoom: {
        count: fourPlusRoomCount,
        avgPrice: fourPlusRoomCount > 0 ? Math.round(fourPlusRoomTotalPrice / fourPlusRoomCount) : 0
      }
    };
  };
  
  const cityRoomStats = calculateRoomTypeStats(propertyData?.prices);
  
  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.propertyMarketAnalysis || "Property Market Analysis"}</h1>
            <p className="text-text-secondary">{t.propertyMarketAnalysisDescription || "Average real estate prices in major Polish cities"}</p>
          </div>
        </header>

        <CalcNavigation />
        
        <div className="flex justify-end mt-4 mb-6">
          <LanguageSelector />
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {/* City Selection */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="flex-grow">
                  <Select defaultValue={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warsaw">Warszawa</SelectItem>
                      <SelectItem value="krakow">Kraków</SelectItem>
                      <SelectItem value="wroclaw">Wrocław</SelectItem>
                      <SelectItem value="gdansk">Gdańsk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col md:flex-row gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['/api/property-prices', selectedCity] });
                      refetch();
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    {t.refresh || "Refresh Cache"}
                  </Button>
                  
                  <Button 
                    variant="default"
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        const cities = ["warsaw", "krakow", "wroclaw", "gdansk"];
                        for (const city of cities) {
                          await fetch(`/api/property-prices?city=${city}&refresh=true&forceOtodom=true`)
                            .then(res => res.json());
                        }
                        // Invalidate all queries and refetch current one
                        queryClient.invalidateQueries({ queryKey: ['/api/property-prices'] });
                        refetch();
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
                    {t.updateAllCities || "Update Property Data"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Data Display */}
          {isPageLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full max-w-md" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-red-500">
                    {t.errorLoadingData || "Error loading data. Please try again later."}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : propertyData && propertyData.prices ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    <CardTitle>
                      {(() => {
                        switch(selectedCity) {
                          case "warsaw": return "Warszawa";
                          case "krakow": return "Kraków";
                          case "wroclaw": return "Wrocław";
                          case "gdansk": return "Gdańsk";
                          default: return selectedCity;
                        }
                      })()}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {t.lastUpdated || "Last updated"}: {propertyData.lastUpdated || "N/A"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg">{t.cityAveragePrice || "City Average"}</span>
                      <span className="text-2xl font-bold text-primary">{formatPrice(cityAverage)} / m²</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      {t.dataBasedOn || "Based on"} {propertyData.prices.reduce((sum: number, district: PropertyPrice) => sum + district.numberOfListings, 0)} {t.activeListings || "active listings"}.
                    </p>
                    
                    {/* Room type statistics */}
                    {propertyData.prices[0]?.roomBreakdown && (
                      <>
                        <Separator className="my-4" />
                        <div className="mt-4">
                          <h3 className="font-medium mb-3">{t.pricesByRoomType || "Average prices by room type"}</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* One-room apartments */}
                            <div className="bg-gray-50 rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Bed size={16} className="text-primary" />
                                <span className="text-sm font-medium">{t.oneRoom || "1 Room"}</span>
                              </div>
                              <div className="text-lg font-semibold">{formatPrice(cityRoomStats.oneRoom.avgPrice)}</div>
                              <div className="text-xs text-muted-foreground">{cityRoomStats.oneRoom.count} {t.listings || "listings"}</div>
                            </div>
                            
                            {/* Two-room apartments */}
                            <div className="bg-gray-50 rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Layers size={16} className="text-primary" />
                                <span className="text-sm font-medium">{t.twoRoom || "2 Rooms"}</span>
                              </div>
                              <div className="text-lg font-semibold">{formatPrice(cityRoomStats.twoRoom.avgPrice)}</div>
                              <div className="text-xs text-muted-foreground">{cityRoomStats.twoRoom.count} {t.listings || "listings"}</div>
                            </div>
                            
                            {/* Three-room apartments */}
                            <div className="bg-gray-50 rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Layers size={16} className="text-primary" />
                                <span className="text-sm font-medium">{t.threeRoom || "3 Rooms"}</span>
                              </div>
                              <div className="text-lg font-semibold">{formatPrice(cityRoomStats.threeRoom.avgPrice)}</div>
                              <div className="text-xs text-muted-foreground">{cityRoomStats.threeRoom.count} {t.listings || "listings"}</div>
                            </div>
                            
                            {/* Four-plus-room apartments */}
                            <div className="bg-gray-50 rounded p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <Box size={16} className="text-primary" />
                                <span className="text-sm font-medium">{t.fourPlusRoom || "4+ Rooms"}</span>
                              </div>
                              <div className="text-lg font-semibold">{formatPrice(cityRoomStats.fourPlusRoom.avgPrice)}</div>
                              <div className="text-xs text-muted-foreground">{cityRoomStats.fourPlusRoom.count} {t.listings || "listings"}</div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* District Data Table */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    <CardTitle>{t.pricesByDistrict || "Prices by District"}</CardTitle>
                  </div>
                  <CardDescription>
                    {t.pricesByDistrictDescription || "Average price per square meter in different areas"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.district || "District"}</TableHead>
                        <TableHead>{t.avgPricePerSqm || "Avg. Price/m²"}</TableHead>
                        <TableHead className="text-right">{t.listings || "Listings"}</TableHead>
                        <TableHead className="text-right">{t.priceRange || "Price Range"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {propertyData.prices
                        .sort((a: PropertyPrice, b: PropertyPrice) => b.averagePricePerSqm - a.averagePricePerSqm)
                        .map((district: PropertyPrice, index: number) => (
                        <>
                          <TableRow key={index}>
                            <TableCell className="font-medium">{district.district}</TableCell>
                            <TableCell>
                              {formatPrice(district.averagePricePerSqm)}
                              <div className="mt-1">
                                {district.averagePricePerSqm > cityAverage * 1.1 ? (
                                  <Badge variant="outline" className="bg-red-50 text-red-600 hover:bg-red-50">
                                    +{Math.round((district.averagePricePerSqm / cityAverage - 1) * 100)}% {t.aboveAvg || "above avg"}
                                  </Badge>
                                ) : district.averagePricePerSqm < cityAverage * 0.9 ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-600 hover:bg-green-50">
                                    {Math.round((1 - district.averagePricePerSqm / cityAverage) * 100)}% {t.belowAvg || "below avg"}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-50">
                                    {t.nearAvg || "near average"}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{district.numberOfListings}</TableCell>
                            <TableCell className="text-right">
                              <div>{formatPrice(district.minPrice)}</div>
                              <div>-</div>
                              <div>{formatPrice(district.maxPrice)}</div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Room breakdown for this district */}
                          {district.roomBreakdown && (
                            <TableRow className="bg-gray-50/50">
                              <TableCell colSpan={4} className="py-2">
                                <div className="text-xs font-medium mb-1">{t.roomBreakdown || "Room breakdown"}</div>
                                <div className="grid grid-cols-4 gap-2">
                                  <div>
                                    <div className="text-xs text-muted-foreground">{t.oneRoom || "1 Room"}</div>
                                    <div className="text-sm">{formatPrice(district.roomBreakdown.oneRoom.avgPrice)}</div>
                                    <div className="text-xs text-muted-foreground">{district.roomBreakdown.oneRoom.count} {t.listings || "listings"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">{t.twoRoom || "2 Rooms"}</div>
                                    <div className="text-sm">{formatPrice(district.roomBreakdown.twoRoom.avgPrice)}</div>
                                    <div className="text-xs text-muted-foreground">{district.roomBreakdown.twoRoom.count} {t.listings || "listings"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">{t.threeRoom || "3 Rooms"}</div>
                                    <div className="text-sm">{formatPrice(district.roomBreakdown.threeRoom.avgPrice)}</div>
                                    <div className="text-xs text-muted-foreground">{district.roomBreakdown.threeRoom.count} {t.listings || "listings"}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-muted-foreground">{t.fourPlusRoom || "4+ Rooms"}</div>
                                    <div className="text-sm">{formatPrice(district.roomBreakdown.fourPlusRoom.avgPrice)}</div>
                                    <div className="text-xs text-muted-foreground">{district.roomBreakdown.fourPlusRoom.count} {t.listings || "listings"}</div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <div className="text-sm text-muted-foreground mt-2">
                <p>{t.dataDisclaimer || "Data collected from"} {propertyData.source || "Otodom"}. 
                {t.dataDisclaimerDetails || "Prices may vary and should be treated as approximate values."}</p>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {t.noDataAvailable || "No data available for the selected city. Please try another city or refresh."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}