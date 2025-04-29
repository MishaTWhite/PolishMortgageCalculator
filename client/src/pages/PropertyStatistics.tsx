import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import CalcNavigation from "@/components/CalcNavigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PropertyListing {
  district: string;
  roomType: string;
  price: number;
  area: number;
  pricePerSqm: number;
}

interface DistrictSummary {
  district: string;
  roomType: string;
  count: number;
  avgPricePerSqm: number;
  avgPrice: number;
  avgArea: number;
  timestamp: string;
}

interface PropertyPriceResponse {
  city: string;
  prices: DistrictSummary[];
}

export default function PropertyStatistics() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [selectedTab, setSelectedTab] = useState("oneRoom");
  
  // Функция для форматирования числа с разделителями разрядов
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat(language === "pl" ? "pl-PL" : language === "ua" ? "uk-UA" : "en-US").format(Math.round(num));
  };

  // Получение данных с сервера
  const {
    data: propertyData,
    isLoading,
    isError,
    refetch,
    error,
  } = useQuery<PropertyPriceResponse>({
    queryKey: ["/api/property-statistics"],
    staleTime: 5 * 60 * 1000, // Данные считаются свежими в течение 5 минут
  });

  // Инициировать скрапинг новых данных с Otodom
  const refreshPropertyData = async () => {
    try {
      await fetch("/api/scrape-property-data", { method: "POST" });
      // Ждем немного и затем обновляем данные
      setTimeout(() => {
        refetch();
      }, 3000);
    } catch (error) {
      console.error("Failed to trigger scraping:", error);
    }
  };

  // Получаем уникальные типы комнат для создания вкладок
  const roomTypes = new Set<string>();
  if (propertyData?.prices) {
    propertyData.prices.forEach((item) => roomTypes.add(item.roomType));
  }

  // Фильтруем данные по выбранному типу комнат
  const filteredData = propertyData?.prices.filter(
    (item) => item.roomType === selectedTab
  );

  // Функция для преобразования технического названия типа комнат в читаемое
  const getRoomTypeLabel = (roomType: string) => {
    switch (roomType) {
      case "oneRoom":
        return t.oneRoom;
      case "twoRoom":
        return t.twoRoom;
      case "threeRoom":
        return t.threeRoom;
      case "fourPlusRoom":
        return t.fourPlusRoom;
      default:
        return roomType;
    }
  };

  // Получаем статистику по всем типам комнат
  const roomTypeSummary = Array.from(roomTypes).map((roomType) => {
    const roomData = propertyData?.prices.filter(
      (item) => item.roomType === roomType
    );
    
    if (!roomData || roomData.length === 0) return null;
    
    // Считаем средние значения для каждого типа комнат
    const totalListings = roomData.reduce((sum, item) => sum + item.count, 0);
    const avgPricePerSqm = roomData.reduce((sum, item) => sum + item.avgPricePerSqm * item.count, 0) / totalListings;
    const avgPrice = roomData.reduce((sum, item) => sum + item.avgPrice * item.count, 0) / totalListings;
    const avgArea = roomData.reduce((sum, item) => sum + item.avgArea * item.count, 0) / totalListings;
    
    return {
      roomType,
      label: getRoomTypeLabel(roomType),
      count: totalListings,
      avgPricePerSqm,
      avgPrice,
      avgArea,
    };
  }).filter(Boolean);

  // Получаем последнюю дату обновления данных
  const getLastUpdatedDate = () => {
    if (!propertyData?.prices || propertyData.prices.length === 0) return "";
    
    const timestamps = propertyData.prices
      .map((item) => new Date(item.timestamp).getTime())
      .sort((a, b) => b - a);
    
    if (timestamps.length === 0) return "";
    
    const lastUpdate = new Date(timestamps[0]);
    return lastUpdate.toLocaleString(
      language === "pl" ? "pl-PL" : language === "ua" ? "uk-UA" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-4">{t.propertyStatistics || "Property Statistics"}</h1>
      <CalcNavigation />

      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            {propertyData?.city 
              ? `${t.cityAveragePrice}: ${propertyData.city}` 
              : t.cityAveragePrice}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.lastUpdated}: {getLastUpdatedDate()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refreshPropertyData()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {t.forceRefresh}
        </Button>
      </div>

      {isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>{t.error}</AlertTitle>
          <AlertDescription>
            {t.errorLoadingData} {error instanceof Error ? error.message : ""}
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t.loading}...</span>
        </div>
      ) : !propertyData || propertyData.prices.length === 0 ? (
        <Alert className="mb-4">
          <AlertTitle>{t.noDataAvailable}</AlertTitle>
          <AlertDescription>
            {t.dataDisclaimerDetails}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Сводная информация по типам комнат */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t.roomBreakdown}</CardTitle>
              <CardDescription>{t.pricesByRoomType}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.roomBreakdown}</TableHead>
                    <TableHead className="text-right">{t.listings}</TableHead>
                    <TableHead className="text-right">{t.avgPricePerSqm}</TableHead>
                    <TableHead className="text-right">{t.propertyPrice}</TableHead>
                    <TableHead className="text-right">{t.avgArea}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roomTypeSummary.map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {summary?.label}
                      </TableCell>
                      <TableCell className="text-right">
                        {summary?.count}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(summary?.avgPricePerSqm || 0)} zł/m²
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(summary?.avgPrice || 0)} zł
                      </TableCell>
                      <TableCell className="text-right">
                        {summary?.avgArea?.toFixed(1)} m²
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Статистика по районам */}
          <Card>
            <CardHeader>
              <CardTitle>{t.pricesByDistrict}</CardTitle>
              <CardDescription>
                {t.pricesByDistrictDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                defaultValue={selectedTab}
                onValueChange={setSelectedTab}
                className="w-full"
              >
                <TabsList className="mb-4">
                  {Array.from(roomTypes).map((roomType) => (
                    <TabsTrigger key={roomType} value={roomType}>
                      {getRoomTypeLabel(roomType)}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={selectedTab} className="pt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.district}</TableHead>
                        <TableHead className="text-right">{t.listings}</TableHead>
                        <TableHead className="text-right">{t.avgPricePerSqm}</TableHead>
                        <TableHead className="text-right">{t.propertyPrice}</TableHead>
                        <TableHead className="text-right">{t.avgArea}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData && filteredData.length > 0 ? (
                        filteredData.map((district, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {district.district}
                            </TableCell>
                            <TableCell className="text-right">
                              {district.count}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(district.avgPricePerSqm)} zł/m²
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(district.avgPrice)} zł
                            </TableCell>
                            <TableCell className="text-right">
                              {district.avgArea.toFixed(1)} m²
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center">
                            {t.noDataAvailable}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              {t.dataDisclaimer} Otodom. {t.dataDisclaimerDetails}
            </p>
          </div>
        </>
      )}
    </div>
  );
}