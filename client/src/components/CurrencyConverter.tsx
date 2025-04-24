import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDownIcon, RefreshCwIcon, ArrowUpIcon } from "lucide-react";
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

interface CurrencyAmount {
  value: string;
  baseCurrencyValue: number; // Value converted to base currency (PLN)
}

export default function CurrencyConverter() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for currency amounts
  const [currencyAmounts, setCurrencyAmounts] = useState<Record<string, CurrencyAmount>>(
    CURRENCIES.reduce((acc, curr) => ({
      ...acc,
      [curr.code]: { value: curr.code === "PLN" ? "1000" : "", baseCurrencyValue: 0 }
    }), {})
  );
  
  // Keep track of which currency was last modified
  const [lastModifiedCurrency, setLastModifiedCurrency] = useState<string>("PLN");
  
  // Fetch exchange rates
  const { 
    data: exchangeRates, 
    isLoading, 
    refetch: refetchRates
  } = useQuery<ExchangeRateData>({
    queryKey: ['/api/exchange-rates']
  });
  
  // Convert all currencies based on the input
  useEffect(() => {
    if (!exchangeRates || !exchangeRates.rates) return;
    
    // Get the modified currency and its value
    const modifiedCurrValue = parseFloat(currencyAmounts[lastModifiedCurrency].value);
    if (isNaN(modifiedCurrValue) || modifiedCurrValue <= 0) return;
    
    // Calculate base value in PLN
    let baseValue: number;
    if (lastModifiedCurrency === "PLN") {
      baseValue = modifiedCurrValue;
    } else {
      baseValue = modifiedCurrValue / exchangeRates.rates[lastModifiedCurrency];
    }
    
    // Update all other currencies
    const newAmounts = { ...currencyAmounts };
    CURRENCIES.forEach(currency => {
      if (currency.code === lastModifiedCurrency) {
        newAmounts[currency.code] = { 
          value: currencyAmounts[currency.code].value,
          baseCurrencyValue: baseValue
        };
      } else {
        const convertedValue = baseValue * exchangeRates.rates[currency.code];
        newAmounts[currency.code] = { 
          value: convertedValue.toFixed(2),
          baseCurrencyValue: baseValue
        };
      }
    });
    
    setCurrencyAmounts(newAmounts);
  }, [exchangeRates, lastModifiedCurrency, currencyAmounts[lastModifiedCurrency].value]);
  
  // Handle input change for any currency
  const handleAmountChange = (currencyCode: string, value: string) => {
    setLastModifiedCurrency(currencyCode);
    setCurrencyAmounts(prev => ({
      ...prev,
      [currencyCode]: {
        ...prev[currencyCode],
        value: value
      }
    }));
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">{t.currencyConverter}</h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetchRates()} 
            disabled={isLoading}
          >
            <RefreshCwIcon size={16} className={isLoading ? "animate-spin mr-2" : "mr-2"} />
            {t.refreshRates}
          </Button>
        </div>
        
        {/* Last update info */}
        <p className="text-xs text-text-tertiary mb-4">
          {isLoading ? (
            <Skeleton className="h-4 w-64" />
          ) : (
            `${t.exchangeRatesFrom} ${exchangeRates?.source || 'unknown source'}: ${t.lastUpdated} ${exchangeRates?.fetchDate || 'unknown'}`
          )}
        </p>
        
        {/* Currency input fields */}
        <div className="mb-6 space-y-4">
          {CURRENCIES.map(currency => (
            <div key={currency.code} className="flex items-center gap-4">
              <div className="flex-none w-12 text-center">
                <span className="text-2xl">{currency.flag}</span>
              </div>
              <div className="flex-1">
                <label className="block text-text-secondary text-sm mb-1">
                  {currency.code} - {currency.name}
                </label>
                <Input
                  type="number"
                  value={currencyAmounts[currency.code].value}
                  onChange={(e) => handleAmountChange(currency.code, e.target.value)}
                  className="w-full"
                  placeholder="0.00"
                />
              </div>
              {currency.code === lastModifiedCurrency && (
                <div className="flex-none w-8">
                  <ArrowUpIcon size={20} className="text-primary" />
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Exchange rate table */}
        <div className="mt-6">
          <h3 className="text-md font-medium mb-2">{t.exchangeRateTable}</h3>
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
                        <span>{t.loading}</span>
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
                      {t.failedToLoad}
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