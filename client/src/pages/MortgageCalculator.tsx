import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import PropertyPriceInput from "@/components/PropertyPriceInput";
import DownPaymentSlider from "@/components/DownPaymentSlider";
import LoanDurationSlider from "@/components/LoanDurationSlider";
import MonthlyPaymentSlider from "@/components/MonthlyPaymentSlider";
import InterestRateSection from "@/components/InterestRateSection";
import ResultsPanel from "@/components/ResultsPanel";
import InfoSection from "@/components/InfoSection";
import AcceleratedRepaymentModule from "@/components/AcceleratedRepaymentModule";
import LanguageSelector from "@/components/LanguageSelector";
import CalcNavigation from "@/components/CalcNavigation";
import { calculateMonthlyPayment, calculateLoanDuration, formatCurrency } from "@/lib/mortgageCalculator";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ArrowRight, DollarSign, RefreshCwIcon } from "lucide-react";
import { Link } from "wouter";
import CurrencyConverter from "@/components/CurrencyConverter";
import { Badge } from "@/components/ui/badge";

// Array of supported currencies (same as in CurrencyConverter.tsx)
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

export default function MortgageCalculator() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for calculator inputs
  const [propertyPrice, setPropertyPrice] = useState(500000);
  const [downPaymentPercent, setDownPaymentPercent] = useState(20);
  const [loanDuration, setLoanDuration] = useState(30);
  const [monthlyPayment, setMonthlyPayment] = useState(2529.62);
  const [bankMargin, setBankMargin] = useState(2.0);
  
  // Derived values
  const [loanAmount, setLoanAmount] = useState(400000);
  const [downPaymentAmount, setDownPaymentAmount] = useState(100000);
  const [totalInterestRate, setTotalInterestRate] = useState(7.75);
  const [monthlyPaymentMin, setMonthlyPaymentMin] = useState(1000);
  const [monthlyPaymentMax, setMonthlyPaymentMax] = useState(10000);
  
  // Interest rate related states
  const [selectedWiborType, setSelectedWiborType] = useState("");
  const [baseRateSource, setBaseRateSource] = useState("NBP Reference Rate");
  
  // Currency related states
  const [selectedCurrency, setSelectedCurrency] = useState("PLN");

  // Define response types for API
  interface InterestRateResponse {
    rate: number;
    fetchDate: string;
    source: string;
  }
  
  interface WiborRateResponse {
    rates: Record<string, number>;
    fetchDate: string;
    source: string;
  }
  
  interface BankOfferResponse {
    offers: Array<{
      bankName: string;
      bankMargin: number;
      wiborType: string;
      totalRate: number;
      additionalInfo?: string;
    }>;
    fetchDate: string;
    source: string;
  }
  
  // Fetch base interest rate from API
  const { 
    data: interestRateData, 
    isLoading: isLoadingRate,
    refetch: refetchInterestRate
  } = useQuery<InterestRateResponse>({
    queryKey: ['/api/interest-rate']
  });
  
  // Fetch WIBOR rates
  const {
    data: wiborRates,
    isLoading: isLoadingWibor
  } = useQuery<WiborRateResponse>({
    queryKey: ['/api/wibor-rates'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Fetch bank mortgage offers
  const {
    data: bankOffers,
    isLoading: isLoadingBankOffers
  } = useQuery<BankOfferResponse>({
    queryKey: ['/api/bank-offers'],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  
  // Fetch exchange rates
  const { 
    data: exchangeRates, 
    isLoading: isLoadingRates,
    refetch: refetchRates
  } = useQuery<ExchangeRateData>({
    queryKey: ['/api/exchange-rates']
  });

  // Calculate mortgage details
  const {
    data: mortgageDetails,
    isLoading: isCalculating,
    refetch: recalculate
  } = useQuery({
    queryKey: ['/api/calculate-mortgage', propertyPrice, downPaymentPercent, loanDuration, totalInterestRate],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/calculate-mortgage', {
        propertyPrice,
        downPaymentPercent,
        loanDuration,
        totalInterestRate
      });
      return response.json();
    },
    enabled: false // Don't run automatically, we'll trigger manually
  });

  // Conversion functions
  // Convert a value from the base currency (PLN) to the selected currency
  const convertFromPLN = (amount: number): number => {
    if (!exchangeRates || !exchangeRates.rates || selectedCurrency === "PLN") {
      return amount;
    }
    
    // Get the exchange rate for the selected currency
    const rate = exchangeRates.rates[selectedCurrency];
    if (!rate) return amount;
    
    // Округляем конвертированную сумму до 2 знаков после запятой
    return Math.round(amount * rate * 100) / 100;
  };
  
  // Convert a value from the selected currency to the base currency (PLN)
  const convertToPLN = (amount: number): number => {
    if (!exchangeRates || !exchangeRates.rates || selectedCurrency === "PLN") {
      return amount;
    }
    
    // Get the exchange rate for the selected currency
    const rate = exchangeRates.rates[selectedCurrency];
    if (!rate) return amount;
    
    // Округляем до целых в базовой валюте
    return Math.round(amount / rate);
  };

  // Effect to calculate loan amount when property price or down payment changes
  useEffect(() => {
    // Calculate in PLN regardless of selected currency
    const plnPropertyPrice = selectedCurrency === "PLN" 
      ? propertyPrice 
      : convertToPLN(propertyPrice);
      
    const downAmount = plnPropertyPrice * (downPaymentPercent / 100);
    const loan = plnPropertyPrice - downAmount;
    
    setDownPaymentAmount(selectedCurrency === "PLN" ? downAmount : convertFromPLN(downAmount));
    setLoanAmount(selectedCurrency === "PLN" ? loan : convertFromPLN(loan));
    
    // Update monthly payment slider range - always calculated in base currency (PLN)
    const minPayment = Math.max(1000, Math.ceil(loan / (35 * 12) / 10) * 10);
    // Calculate standard max payment based on 5-year term
    const standardMaxPayment = Math.ceil(loan / (5 * 12) / 10) * 10;
    // Double the max payment (but cap at 20000 PLN) to allow for faster repayments
    const maxPayment = Math.min(20000, standardMaxPayment * 2);
    
    // Convert limits to selected currency
    setMonthlyPaymentMin(selectedCurrency === "PLN" ? minPayment : convertFromPLN(minPayment));
    setMonthlyPaymentMax(selectedCurrency === "PLN" ? maxPayment : convertFromPLN(maxPayment));
    
    // Recalculate monthly payment based on new loan amount - using PLN for calculation
    const newMonthlyPaymentPLN = calculateMonthlyPayment(loan, totalInterestRate, loanDuration);
    const newMonthlyPayment = selectedCurrency === "PLN" 
      ? newMonthlyPaymentPLN
      : convertFromPLN(newMonthlyPaymentPLN);
      
    setMonthlyPayment(newMonthlyPayment);
    
    // Trigger recalculation
    recalculate();
  }, [propertyPrice, downPaymentPercent, recalculate, selectedCurrency, exchangeRates]);

  // Effect to update interest rate when base rate or bank margin changes
  useEffect(() => {
    // Обработка базовой ставки NBP
    if (selectedWiborType === "" && interestRateData) {
      const typedData = interestRateData as InterestRateResponse;
      if (typedData.rate) {
        const newTotalRate = typedData.rate + bankMargin;
        setTotalInterestRate(newTotalRate);
        setBaseRateSource("NBP Reference Rate");
        
        // Пересчитываем месячный платеж в соответствии с новой процентной ставкой
        const loanAmountPLN = selectedCurrency === "PLN" ? loanAmount : convertToPLN(loanAmount);
        const newMonthlyPaymentPLN = calculateMonthlyPayment(loanAmountPLN, newTotalRate, loanDuration);
        const newMonthlyPayment = selectedCurrency === "PLN" 
          ? newMonthlyPaymentPLN 
          : convertFromPLN(newMonthlyPaymentPLN);
        setMonthlyPayment(newMonthlyPayment);
        
        recalculate();
      }
    } 
    // Обработка выбранной ставки WIBOR
    else if (selectedWiborType !== "" && wiborRates && wiborRates.rates && wiborRates.rates[selectedWiborType]) {
      const wiborRate = wiborRates.rates[selectedWiborType];
      const newTotalRate = wiborRate + bankMargin;
      setTotalInterestRate(newTotalRate);
      setBaseRateSource(`WIBOR ${selectedWiborType}`);
      
      // Пересчитываем месячный платеж в соответствии с новой процентной ставкой
      const loanAmountPLN = selectedCurrency === "PLN" ? loanAmount : convertToPLN(loanAmount);
      const newMonthlyPaymentPLN = calculateMonthlyPayment(loanAmountPLN, newTotalRate, loanDuration);
      const newMonthlyPayment = selectedCurrency === "PLN" 
        ? newMonthlyPaymentPLN 
        : convertFromPLN(newMonthlyPaymentPLN);
      setMonthlyPayment(newMonthlyPayment);
      
      recalculate();
    }
  }, [interestRateData, bankMargin, recalculate, selectedWiborType, wiborRates, loanAmount, loanDuration, selectedCurrency, convertToPLN, convertFromPLN]);
  
  // Обработчик выбора ставки WIBOR
  const handleSelectWibor = (wiborType: string, rate: number) => {
    setSelectedWiborType(wiborType);
    // Изменение общей ставки произойдет в useEffect выше
  };
  
  // Обработчик выбора банка
  const handleSelectBank = (bankName: string, margin: number, wiborType: string, wiborRate: number) => {
    setBankMargin(margin);
    setSelectedWiborType(wiborType);
    // Изменение общей ставки произойдет в useEffect выше
  };

  // Handler for monthly payment changes
  const handleMonthlyPaymentChange = (newMonthlyPayment: number) => {
    setMonthlyPayment(newMonthlyPayment);
    
    // Convert monthly payment to PLN for calculation if needed
    const monthlyPaymentPLN = selectedCurrency === "PLN" 
      ? newMonthlyPayment 
      : convertToPLN(newMonthlyPayment);
      
    // Calculate loan amount in PLN
    const loanAmountPLN = selectedCurrency === "PLN" 
      ? loanAmount 
      : convertToPLN(loanAmount);
    
    // Calculate new loan duration based on payment
    const newDuration = calculateLoanDuration(loanAmountPLN, totalInterestRate, monthlyPaymentPLN);
    setLoanDuration(newDuration);
    
    recalculate();
  };

  // Handler for loan duration changes
  const handleLoanDurationChange = (newLoanDuration: number) => {
    setLoanDuration(newLoanDuration);
    
    // Convert loan amount to PLN for calculation if needed
    const loanAmountPLN = selectedCurrency === "PLN" 
      ? loanAmount 
      : convertToPLN(loanAmount);
    
    // Calculate new monthly payment based on duration
    const newMonthlyPaymentPLN = calculateMonthlyPayment(loanAmountPLN, totalInterestRate, newLoanDuration);
    
    // Convert back to selected currency if needed
    const newMonthlyPayment = selectedCurrency === "PLN" 
      ? newMonthlyPaymentPLN 
      : convertFromPLN(newMonthlyPaymentPLN);
      
    setMonthlyPayment(newMonthlyPayment);
    
    recalculate();
  };

  // Handle currency change
  const handleCurrencyChange = (currency: string) => {
    if (currency === selectedCurrency) return;
    
    // Store current values in PLN
    const currentPropertyPricePLN = selectedCurrency === "PLN" 
      ? propertyPrice 
      : convertToPLN(propertyPrice);
      
    const currentMonthlyPaymentPLN = selectedCurrency === "PLN" 
      ? monthlyPayment 
      : convertToPLN(monthlyPayment);
    
    // Set the new currency
    setSelectedCurrency(currency);
    
    // Convert stored values to the new currency with proper rounding
    if (currency === "PLN") {
      setPropertyPrice(Math.round(currentPropertyPricePLN));
      setMonthlyPayment(Math.round(currentMonthlyPaymentPLN * 100) / 100);
    } else if (exchangeRates && exchangeRates.rates && exchangeRates.rates[currency]) {
      const rate = exchangeRates.rates[currency];
      // Округляем до 2 знаков после запятой для предотвращения длинных дробей
      setPropertyPrice(Math.round(currentPropertyPricePLN * rate * 100) / 100);
      setMonthlyPayment(Math.round(currentMonthlyPaymentPLN * rate * 100) / 100);
    }
  };

  // Get currency symbol for display
  const getCurrencySymbol = (code: string): string => {
    switch (code) {
      case "PLN": return "zł";
      case "EUR": return "€";
      case "USD": return "$";
      case "UAH": return "₴";
      default: return code;
    }
  };
  
  // Format amount with currency symbol
  const formatAmount = (amount: number): string => {
    // Округляем число перед форматированием для избежания длинных десятичных частей
    const roundedAmount = Math.round(amount * 100) / 100;
    
    let formatter;
    
    switch (selectedCurrency) {
      case "EUR":
        formatter = new Intl.NumberFormat('de-DE', { 
          style: 'currency', 
          currency: 'EUR',
          maximumFractionDigits: 0
        });
        break;
      case "USD":
        formatter = new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD',
          maximumFractionDigits: 0
        });
        break;
      case "UAH":
        formatter = new Intl.NumberFormat('uk-UA', { 
          style: 'currency', 
          currency: 'UAH',
          maximumFractionDigits: 0
        });
        break;
      default: // PLN
        return formatCurrency(roundedAmount);
    }
    
    return formatter.format(roundedAmount);
  };

  // Main content for mortgage calculator
  const MortgageContent = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white p-6 mb-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">{t.parametersTitle}</h2>
            </div>
            
            {/* Currency selection */}
            <div className="mb-4 flex items-center gap-2">
              <div className="flex-grow">
                <Select defaultValue={selectedCurrency} onValueChange={handleCurrencyChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag} {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCurrency !== "PLN" && (
                <Badge variant="outline" className="ml-2">
                  1 {selectedCurrency} = {exchangeRates?.rates ? 
                    (1 / exchangeRates.rates[selectedCurrency]).toFixed(2) : '?'} PLN
                </Badge>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetchRates()} 
                disabled={isLoadingRates}
              >
                <RefreshCwIcon size={16} className={isLoadingRates ? "animate-spin" : ""} />
              </Button>
            </div>
            
            <PropertyPriceInput 
              value={propertyPrice} 
              onChange={setPropertyPrice}
              currencySymbol={getCurrencySymbol(selectedCurrency)}
              currencyCode={selectedCurrency}
              formatAmount={formatAmount}
            />
            
            <DownPaymentSlider 
              value={downPaymentPercent} 
              onChange={setDownPaymentPercent} 
              downPaymentAmount={downPaymentAmount}
              currencySymbol={getCurrencySymbol(selectedCurrency)}
              currencyCode={selectedCurrency}
              formatAmount={formatAmount}
            />
            
            <LoanDurationSlider 
              value={loanDuration} 
              onChange={handleLoanDurationChange} 
            />
            
            <MonthlyPaymentSlider 
              value={monthlyPayment} 
              onChange={handleMonthlyPaymentChange} 
              min={monthlyPaymentMin}
              max={monthlyPaymentMax}
              currencySymbol={getCurrencySymbol(selectedCurrency)}
              currencyCode={selectedCurrency}
              formatAmount={formatAmount}
            />
            
            <InterestRateSection 
              baseRate={(interestRateData as InterestRateResponse | undefined)?.rate || 5.75} 
              bankMargin={bankMargin} 
              onBankMarginChange={setBankMargin} 
              totalInterestRate={totalInterestRate}
              lastUpdate={(interestRateData as InterestRateResponse | undefined)?.fetchDate || format(new Date(), "dd.MM.yyyy")}
              onRefresh={refetchInterestRate}
              isLoading={isLoadingRate}
              wiborRates={wiborRates?.rates}
              wiborLastUpdate={wiborRates?.fetchDate}
              bankOffers={bankOffers?.offers}
              bankOffersLastUpdate={bankOffers?.fetchDate}
              onSelectWibor={handleSelectWibor}
              onSelectBank={handleSelectBank}
              selectedWiborType={selectedWiborType}
            />
          </div>
        </div>

        {/* Add debug logs inside an invisible element */}
        <div style={{ display: 'none' }}>
          Debug info - current currency: {selectedCurrency},
          Original loan amount (PLN): {selectedCurrency === "PLN" ? loanAmount : propertyPrice - downPaymentAmount},
          Displayed loan amount: {loanAmount},
          Original total interest (PLN): {mortgageDetails?.totalInterest || 0}
        </div>
        
        <ResultsPanel 
          loanAmount={loanAmount}
          monthlyPayment={monthlyPayment}
          loanDuration={loanDuration} 
          totalInterestRate={totalInterestRate}
          totalInterest={
            selectedCurrency === "PLN" 
              ? (mortgageDetails?.totalInterest || 0)
              : convertFromPLN(mortgageDetails?.totalInterest || 0)
          }
          totalRepayment={
            selectedCurrency === "PLN" 
              ? (mortgageDetails?.totalRepayment || 0)
              : convertFromPLN(mortgageDetails?.totalRepayment || 0)
          }
          // This is key for fixing the visualization consistency across currencies:
          // Always use the original PLN values for calculating percentage breakdown
          // We store the true base loan amount in PLN - not the converted version
          originalLoanAmount={mortgageDetails?.loanAmount || 0} 
          originalTotalInterest={mortgageDetails?.totalInterest || 0}
          isLoading={isCalculating || isLoadingRates}
          currencySymbol={getCurrencySymbol(selectedCurrency)}
          currencyCode={selectedCurrency}
          formatAmount={formatAmount}
        />
      </div>

      {/* Accelerated Repayment Module */}
      <AcceleratedRepaymentModule 
        loanAmount={loanAmount}
        monthlyPayment={monthlyPayment}
        loanDuration={loanDuration}
        totalInterestRate={totalInterestRate}
        currencySymbol={getCurrencySymbol(selectedCurrency)}
        currencyCode={selectedCurrency}
        formatAmount={formatAmount}
      />
      
      <InfoSection />
    </>
  );



  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.appTitle}</h1>
            <p className="text-text-secondary">{t.appDescription}</p>
          </div>
        </header>

        <CalcNavigation />
        
        <div className="flex justify-end mt-4 mb-6">
          <LanguageSelector />
        </div>

        {/* Display mortgage calculator content */}
        {MortgageContent}
        
        <footer className="text-center text-text-tertiary text-sm mt-6">
          <p>© {new Date().getFullYear()} {t.footerText} {format(new Date(), "dd.MM.yyyy")}</p>
        </footer>
      </div>
    </div>
  );
}
