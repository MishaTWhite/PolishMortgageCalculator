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
import LanguageSelector from "@/components/LanguageSelector";
import { calculateMonthlyPayment, calculateLoanDuration } from "@/lib/mortgageCalculator";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";

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

  // Define response type for interest rate API
  interface InterestRateResponse {
    rate: number;
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

  // Effect to calculate loan amount when property price or down payment changes
  useEffect(() => {
    const downAmount = propertyPrice * (downPaymentPercent / 100);
    const loan = propertyPrice - downAmount;
    setDownPaymentAmount(downAmount);
    setLoanAmount(loan);
    
    // Update monthly payment slider range
    const minPayment = Math.max(1000, Math.ceil(loan / (35 * 12) / 10) * 10);
    // Calculate standard max payment based on 5-year term
    const standardMaxPayment = Math.ceil(loan / (5 * 12) / 10) * 10;
    // Double the max payment (but cap at 20000 PLN) to allow for faster repayments
    const maxPayment = Math.min(20000, standardMaxPayment * 2);
    setMonthlyPaymentMin(minPayment);
    setMonthlyPaymentMax(maxPayment);
    
    // Recalculate monthly payment based on new loan amount
    const newMonthlyPayment = calculateMonthlyPayment(loan, totalInterestRate, loanDuration);
    setMonthlyPayment(newMonthlyPayment);
    
    // Trigger recalculation
    recalculate();
  }, [propertyPrice, downPaymentPercent, recalculate]);

  // Effect to update interest rate when base rate or bank margin changes
  useEffect(() => {
    if (interestRateData) {
      const typedData = interestRateData as InterestRateResponse;
      if (typedData.rate) {
        const newTotalRate = typedData.rate + bankMargin;
        setTotalInterestRate(newTotalRate);
        recalculate();
      }
    }
  }, [interestRateData, bankMargin, recalculate]);

  // Handler for monthly payment changes
  const handleMonthlyPaymentChange = (newMonthlyPayment: number) => {
    setMonthlyPayment(newMonthlyPayment);
    
    // Calculate new loan duration based on payment
    const newDuration = calculateLoanDuration(loanAmount, totalInterestRate, newMonthlyPayment);
    setLoanDuration(newDuration);
    
    recalculate();
  };

  // Handler for loan duration changes
  const handleLoanDurationChange = (newLoanDuration: number) => {
    setLoanDuration(newLoanDuration);
    
    // Calculate new monthly payment based on duration
    const newMonthlyPayment = calculateMonthlyPayment(loanAmount, totalInterestRate, newLoanDuration);
    setMonthlyPayment(newMonthlyPayment);
    
    recalculate();
  };

  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.appTitle}</h1>
            <p className="text-text-secondary">{t.appDescription}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <LanguageSelector />
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 mb-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-medium mb-4">{t.parametersTitle}</h2>
              
              <PropertyPriceInput 
                value={propertyPrice} 
                onChange={setPropertyPrice} 
              />
              
              <DownPaymentSlider 
                value={downPaymentPercent} 
                onChange={setDownPaymentPercent} 
                downPaymentAmount={downPaymentAmount} 
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
              />
              
              <InterestRateSection 
                baseRate={(interestRateData as InterestRateResponse | undefined)?.rate || 5.75} 
                bankMargin={bankMargin} 
                onBankMarginChange={setBankMargin} 
                totalInterestRate={totalInterestRate}
                lastUpdate={(interestRateData as InterestRateResponse | undefined)?.fetchDate || format(new Date(), "dd.MM.yyyy")}
                onRefresh={refetchInterestRate}
                isLoading={isLoadingRate}
              />
            </div>
          </div>

          <ResultsPanel 
            loanAmount={loanAmount}
            monthlyPayment={monthlyPayment}
            loanDuration={loanDuration} 
            totalInterestRate={totalInterestRate}
            totalInterest={mortgageDetails?.totalInterest || 0}
            totalRepayment={mortgageDetails?.totalRepayment || 0}
            isLoading={isCalculating}
          />
        </div>

        <InfoSection />
        
        <footer className="text-center text-text-tertiary text-sm mt-6">
          <p>© {new Date().getFullYear()} {t.footerText} {format(new Date(), "dd.MM.yyyy")}</p>
        </footer>
      </div>
    </div>
  );
}
