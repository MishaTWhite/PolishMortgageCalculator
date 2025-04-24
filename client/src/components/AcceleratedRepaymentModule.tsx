import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/mortgageCalculator";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Badge } from "@/components/ui/badge";

interface AcceleratedRepaymentModuleProps {
  loanAmount: number;
  monthlyPayment: number;
  loanDuration: number;
  totalInterestRate: number;
  currencySymbol?: string;
  currencyCode?: string;
  formatAmount?: (amount: number) => string;
}

export default function AcceleratedRepaymentModule({
  loanAmount,
  monthlyPayment,
  loanDuration,
  totalInterestRate,
  currencySymbol = "zł",
  currencyCode = "PLN",
  formatAmount = formatCurrency
}: AcceleratedRepaymentModuleProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for accelerated repayment inputs
  const [acceleratedDuration, setAcceleratedDuration] = useState(12); // in months
  const [paymentMultiplier, setPaymentMultiplier] = useState(1.5);
  
  // Calculated results
  const [termReduction, setTermReduction] = useState<{ months: number, years: number }>({ months: 0, years: 0 });
  const [newMonthlyPayment, setNewMonthlyPayment] = useState(monthlyPayment);
  
  // Calculate effects of accelerated repayment
  useEffect(() => {
    if (loanAmount <= 0 || monthlyPayment <= 0 || loanDuration <= 0) return;
    
    // Convert annual interest rate to monthly
    const monthlyInterestRate = totalInterestRate / 100 / 12;
    const totalMonths = loanDuration * 12;
    
    // Create an array to track the loan balance
    let remainingLoanBalance = loanAmount;
    let monthsElapsed = 0;
    let totalPaid = 0;
    
    // Calculate the accelerated payment
    const acceleratedPayment = monthlyPayment * paymentMultiplier;
    
    // Phase 1: Make accelerated payments for the specified duration
    for (let i = 0; i < acceleratedDuration && remainingLoanBalance > 0; i++) {
      // Add interest for the month
      remainingLoanBalance += remainingLoanBalance * monthlyInterestRate;
      
      // Make the accelerated payment
      const payment = Math.min(acceleratedPayment, remainingLoanBalance);
      remainingLoanBalance -= payment;
      totalPaid += payment;
      monthsElapsed++;
      
      if (remainingLoanBalance <= 0) break;
    }
    
    // If loan is fully paid, calculate term reduction
    if (remainingLoanBalance <= 0) {
      const monthsReduction = totalMonths - monthsElapsed;
      const yearsReduction = Math.floor(monthsReduction / 12);
      const remainingMonths = monthsReduction % 12;
      
      setTermReduction({
        months: remainingMonths,
        years: yearsReduction
      });
      
      // New monthly payment would be 0 since loan is paid off
      setNewMonthlyPayment(0);
      
      return;
    }
    
    // Phase 2: Calculate new term if continuing with standard payments
    let standardPaymentMonths = 0;
    const originalLoanBalance = remainingLoanBalance;
    
    while (remainingLoanBalance > 0) {
      // Add interest for the month
      remainingLoanBalance += remainingLoanBalance * monthlyInterestRate;
      
      // Make the standard payment
      const payment = Math.min(monthlyPayment, remainingLoanBalance);
      remainingLoanBalance -= payment;
      standardPaymentMonths++;
      
      // Safety check to prevent infinite loop
      if (standardPaymentMonths > 1000) break;
    }
    
    // Calculate term reduction
    const totalNewTermMonths = monthsElapsed + standardPaymentMonths;
    const monthsReduction = totalMonths - totalNewTermMonths;
    const yearsReduction = Math.floor(monthsReduction / 12);
    const remainingMonths = monthsReduction % 12;
    
    setTermReduction({
      months: remainingMonths,
      years: yearsReduction
    });
    
    // Calculate new monthly payment if user wants to keep original term
    // We need to recalculate based on remaining balance after accelerated period
    if (originalLoanBalance > 0) {
      const remainingTermMonths = totalMonths - monthsElapsed;
      
      if (remainingTermMonths > 0) {
        // Calculate new payment using the standard mortgage formula
        // P = L[c(1 + c)^n]/[(1 + c)^n - 1]
        // Where: P = payment, L = loan amount, c = monthly interest rate, n = number of payments
        const newPayment = originalLoanBalance * 
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, remainingTermMonths)) / 
          (Math.pow(1 + monthlyInterestRate, remainingTermMonths) - 1);
        
        setNewMonthlyPayment(newPayment);
      } else {
        setNewMonthlyPayment(0);
      }
    } else {
      setNewMonthlyPayment(0);
    }
  }, [loanAmount, monthlyPayment, loanDuration, totalInterestRate, acceleratedDuration, paymentMultiplier]);
  
  const handleAcceleratedDurationChange = (values: number[]) => {
    setAcceleratedDuration(values[0]);
  };
  
  const handlePaymentMultiplierChange = (values: number[]) => {
    setPaymentMultiplier(values[0]);
  };
  
  // Helper to format months as years and months using translations
  const formatMonthsAsYearsAndMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (years === 0) {
      return `${remainingMonths} ${remainingMonths === 1 ? t.month : t.months}`;
    } else if (remainingMonths === 0) {
      return `${years} ${years === 1 ? t.year : t.repaymentYears}`;
    } else {
      return `${years} ${years === 1 ? t.year : t.repaymentYears} ${t.andText} ${remainingMonths} ${remainingMonths === 1 ? t.month : t.months}`;
    }
  };
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">{t.acceleratedRepayment}</h2>
        <p className="text-sm text-text-secondary mb-6">
          {t.acceleratedRepaymentDescription}
        </p>
        
        {/* Accelerated period slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-text-secondary text-sm" htmlFor="accelerated-duration">
              {t.durationOfAcceleratedRepayment}
            </label>
            <span className="text-sm font-medium">
              {formatMonthsAsYearsAndMonths(acceleratedDuration)}
            </span>
          </div>
          <Slider
            id="accelerated-duration"
            value={[acceleratedDuration]}
            min={1}
            max={60}
            step={1}
            className="w-full mt-2"
            onValueChange={handleAcceleratedDurationChange}
          />
          <div className="flex justify-between text-xs text-text-tertiary mt-1">
            <span>1 {t.month}</span>
            <span>5 {t.repaymentYears}</span>
          </div>
        </div>
        
        {/* Payment multiplier slider */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-1">
            <label className="block text-text-secondary text-sm" htmlFor="payment-multiplier">
              {t.paymentMultiplier}
            </label>
            <span className="text-sm font-medium">
              {paymentMultiplier.toFixed(1)}x ({currencyCode} {formatAmount(monthlyPayment * paymentMultiplier)})
            </span>
          </div>
          <Slider
            id="payment-multiplier"
            value={[paymentMultiplier]}
            min={1.1}
            max={3}
            step={0.1}
            className="w-full mt-2"
            onValueChange={handlePaymentMultiplierChange}
          />
          <div className="flex justify-between text-xs text-text-tertiary mt-1">
            <span>1.1x</span>
            <span>3.0x</span>
          </div>
        </div>
        
        {/* Results section */}
        <div className="mt-6 bg-secondary p-4 rounded-md">
          <h3 className="text-md font-medium mb-3">{t.resultsLabel}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Term reduction */}
            <div className="p-4 bg-white shadow-sm rounded-md">
              <h4 className="text-sm text-text-secondary mb-1">{t.loanTermReduction}</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-medium">
                  {termReduction.years} {termReduction.years === 1 ? t.year : t.repaymentYears} {termReduction.months} {termReduction.months === 1 ? t.month : t.months}
                </span>
              </div>
              <p className="text-xs text-text-tertiary">
                {t.acceleratedPaymentDescription1} {paymentMultiplier.toFixed(1)}{t.paymentMultiplierWithAmount} {t.acceleratedPaymentDescription2} {formatMonthsAsYearsAndMonths(acceleratedDuration)}
              </p>
            </div>
            
            {/* New monthly payment */}
            <div className="p-4 bg-white shadow-sm rounded-md">
              <h4 className="text-sm text-text-secondary mb-1">{t.newMonthlyPayment}</h4>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl font-medium">
                  {currencyCode} {formatAmount(newMonthlyPayment)}
                </span>
                {newMonthlyPayment < monthlyPayment && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {t.save} {formatAmount(monthlyPayment - newMonthlyPayment)}/{t.perMonth}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-text-tertiary">
                {t.acceleratedPaymentDescription1} {paymentMultiplier.toFixed(1)}{t.paymentMultiplierWithAmount} {t.acceleratedPaymentDescription2} {formatMonthsAsYearsAndMonths(acceleratedDuration)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}