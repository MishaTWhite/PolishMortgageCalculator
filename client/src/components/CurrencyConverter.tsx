import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowsUpDownIcon, RefreshCwIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/mortgageCalculator";

// Array of supported currencies
const CURRENCIES = [
  { code: "PLN", name: "Polish Złoty", flag: "🇵🇱" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "UAH", name: "Ukrainian Hryvnia", flag: "🇺🇦" }
];

// Type for exchange rates response
interface ExchangeRateData {
  source: string;
  base: string;
  rates: Record<string, number>;
  fetchDate: string;
}

export default function CurrencyConverter() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for amount and selected currencies
  const [amount, setAmount] = useState<number>(1000);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("PLN");
  
  // Fetch exchange rates
  const { 
    data: exchangeRates, 
    isLoading, 
    refetch: refetchRates
  } = useQuery<ExchangeRateData>({
    queryKey: ['/api/exchange-rates']
  });
  
  // Handle input change
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setAmount(value);
    }
  };
  
  // Convert from selected currency to all currencies
  const convertFromCurrency = (amount: number, fromCurrency: string) => {
    if (!exchangeRates || !exchangeRates.rates) return {};
    
    // If the base currency is already PLN
    if (exchangeRates.base === "PLN") {
      // Special case: From PLN to other currencies
      if (fromCurrency === "PLN") {
        return Object.fromEntries(
          CURRENCIES.map(currency => [
            currency.code, 
            amount * (exchangeRates.rates[currency.code] || 0)
          ])
        );
      }
      
      // From other currency to all currencies
      // First convert to PLN, then to other currencies
      const toPLN = amount / exchangeRates.rates[fromCurrency];
      return Object.fromEntries(
        CURRENCIES.map(currency => [
          currency.code, 
          toPLN * (exchangeRates.rates[currency.code] || 0)
        ])
      );
    } else {
      // If the base currency is not PLN, this would require more conversion logic
      // but since we're using PLN as base in our API this shouldn't happen
      return {};
    }
  };
  
  // Calculate converted amounts
  const convertedAmounts = exchangeRates 
    ? convertFromCurrency(amount, selectedCurrency)
    : {};
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">Currency Converter</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchRates()} 
            disabled={isLoading}
          >
            <RefreshCwIcon size={16} className={isLoading ? "animate-spin mr-2" : "mr-2"} />
            Refresh Rates
          </Button>
        </div>
        
        {/* Last update info */}
        <p className="text-xs text-text-tertiary mb-4">
          {isLoading ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            `Exchange rates from ${exchangeRates?.source || 'unknown source'}: last updated ${exchangeRates?.fetchDate || 'unknown'}`
          )}
        </p>
        
        {/* Amount input */}
        <div className="mb-6">
          <label className="block text-text-secondary text-sm mb-1">Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              value={amount}
              onChange={handleAmountChange}
              className="flex-1"
            />
            <div className="relative w-1/3">
              <select
                className="w-full h-full border rounded-md px-3 py-2 appearance-none bg-white"
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
              >
                {CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.flag} {currency.code}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ArrowsUpDownIcon size={16} />
              </div>
            </div>
          </div>
        </div>
        
        {/* Converted amount cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CURRENCIES.filter(currency => currency.code !== selectedCurrency).map(currency => (
            <div 
              key={currency.code} 
              className="bg-secondary bg-opacity-50 rounded-md p-4"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-medium">
                    {isLoading ? (
                      <Skeleton className="h-6 w-24" />
                    ) : (
                      formatCurrency(convertedAmounts[currency.code] || 0)
                    )}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {currency.flag} {currency.code} - {currency.name}
                  </div>
                </div>
                <div className="text-text-tertiary text-sm">
                  {isLoading ? (
                    <Skeleton className="h-4 w-16" />
                  ) : (
                    `1 ${selectedCurrency} = ${exchangeRates?.rates?.[currency.code] 
                      ? (exchangeRates.rates[currency.code] / exchangeRates.rates[selectedCurrency]).toFixed(4) 
                      : '?'} ${currency.code}`
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Exchange rate table */}
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">Exchange Rate Table</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Currency</th>
                  {CURRENCIES.map(currency => (
                    <th key={currency.code} className="text-right py-2 px-2">
                      {currency.flag} {currency.code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={CURRENCIES.length + 1} className="py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCwIcon size={20} className="animate-spin" />
                        <span>Loading exchange rates...</span>
                      </div>
                    </td>
                  </tr>
                ) : exchangeRates ? (
                  CURRENCIES.map(fromCurrency => (
                    <tr key={fromCurrency.code} className="border-b">
                      <td className="py-2 px-2 font-medium">
                        {fromCurrency.flag} {fromCurrency.code}
                      </td>
                      {CURRENCIES.map(toCurrency => {
                        const rate = exchangeRates.rates[fromCurrency.code] && exchangeRates.rates[toCurrency.code]
                          ? (exchangeRates.rates[toCurrency.code] / exchangeRates.rates[fromCurrency.code]).toFixed(4)
                          : '—';
                        return (
                          <td key={toCurrency.code} className="text-right py-2 px-2">
                            {fromCurrency.code === toCurrency.code ? '1.0000' : rate}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={CURRENCIES.length + 1} className="py-4 text-center">
                      Failed to load exchange rates
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}