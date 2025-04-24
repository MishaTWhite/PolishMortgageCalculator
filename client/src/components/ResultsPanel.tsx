import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, calculateLoanPercentages } from "@/lib/mortgageCalculator";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { useEffect, useState } from "react";

interface ResultsPanelProps {
  loanAmount: number;
  monthlyPayment: number;
  loanDuration: number;
  totalInterestRate: number;
  totalInterest: number;
  totalRepayment: number;
  isLoading: boolean;
  currencySymbol?: string;
  currencyCode?: string;
  formatAmount?: (amount: number) => string;
}

export default function ResultsPanel({
  loanAmount,
  monthlyPayment,
  loanDuration,
  totalInterestRate,
  totalInterest,
  totalRepayment,
  isLoading,
  currencySymbol = "zł",
  currencyCode = "PLN",
  formatAmount = formatCurrency
}: ResultsPanelProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // Store rounded values to prevent display issues
  const [roundedAmount, setRoundedAmount] = useState(Math.round(loanAmount));
  const [roundedMonthlyPayment, setRoundedMonthlyPayment] = useState(Math.round(monthlyPayment * 100) / 100);
  const [roundedTotalInterest, setRoundedTotalInterest] = useState(Math.round(totalInterest));
  const [roundedTotalRepayment, setRoundedTotalRepayment] = useState(Math.round(totalRepayment));
  
  // Store percentages to ensure visualization remains stable during currency changes
  const [principalPercent, setPrincipalPercent] = useState(0);
  const [interestPercent, setInterestPercent] = useState(0);
  
  useEffect(() => {
    // Round values for display
    setRoundedAmount(Math.round(loanAmount));
    setRoundedMonthlyPayment(Math.round(monthlyPayment * 100) / 100);
    setRoundedTotalInterest(Math.round(totalInterest));
    setRoundedTotalRepayment(Math.round(totalRepayment));
    
    // Calculate percentage breakdown for visualization
    // Using actual values for calculation but store rounded percentages
    const { principalPercent: pp, interestPercent: ip } = calculateLoanPercentages(loanAmount, totalInterest);
    setPrincipalPercent(Math.round(pp));
    setInterestPercent(Math.round(ip));
  }, [loanAmount, monthlyPayment, totalInterest, totalRepayment]);
  
  const numberOfPayments = loanDuration * 12;
  
  return (
    <div className="lg:col-span-1">
      <Card className="mb-6 sticky top-4">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">{t.resultsTitle}</h2>
          
          {/* Loan Summary */}
          <div className="mb-6 p-4 bg-secondary rounded-md">
            <h3 className="text-sm font-medium text-text-secondary mb-2">{t.loanSummary}</h3>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-text-secondary">{t.loanAmount}</div>
              <div className="text-sm font-medium text-right">
                {currencyCode} {formatAmount(roundedAmount)}
              </div>
              
              <div className="text-sm text-text-secondary">{t.monthlyPayment}:</div>
              <div className="text-lg font-medium text-primary text-right">
                {isLoading ? (
                  <Skeleton className="h-6 w-24 ml-auto" />
                ) : (
                  `${currencyCode} ${formatAmount(roundedMonthlyPayment)}`
                )}
              </div>
              
              <div className="text-sm text-text-secondary">{t.duration}</div>
              <div className="text-sm font-medium text-right">
                {loanDuration} {t.years} ({numberOfPayments} {t.payments})
              </div>
              
              <div className="text-sm text-text-secondary">{t.interestRate}</div>
              <div className="text-sm font-medium text-right">
                {totalInterestRate.toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* Detailed Breakdown */}
          <div>
            <h3 className="text-sm font-medium text-text-secondary mb-3">{t.totalCost}</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t.loanAmount}</span>
                <span className="text-sm font-medium">
                  {currencyCode} {formatAmount(roundedAmount)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">{t.totalInterest}</span>
                {isLoading ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <span className="text-sm font-medium">
                    {currencyCode} {formatAmount(roundedTotalInterest)}
                  </span>
                )}
              </div>
              
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-sm font-medium">{t.totalRepayment}</span>
                {isLoading ? (
                  <Skeleton className="h-6 w-28" />
                ) : (
                  <span className="text-base font-medium">
                    {currencyCode} {formatAmount(roundedTotalRepayment)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Visualization */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">{t.loanStructure}</h3>
            
            <div className="h-[120px] bg-gray-50 p-2 rounded-md relative overflow-hidden">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <>
                  <div className="flex h-full">
                    <div 
                      className="bg-primary h-full" 
                      style={{ width: `${principalPercent}%` }}
                    ></div>
                    <div 
                      className="bg-amber-500 h-full" 
                      style={{ width: `${interestPercent}%` }}
                    ></div>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs text-white px-2 text-center">
                      <span className="font-medium">{principalPercent}%</span>
                      <br />{t.principal}
                    </div>
                    <div className="text-xs text-white px-2 text-center">
                      <span className="font-medium">{interestPercent}%</span>
                      <br />{t.interest}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-6 text-xs text-text-tertiary">
            <p>{t.disclaimer}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
