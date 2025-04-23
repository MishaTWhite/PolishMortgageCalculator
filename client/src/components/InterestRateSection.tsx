import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";

interface InterestRateSectionProps {
  baseRate: number;
  bankMargin: number;
  onBankMarginChange: (value: number) => void;
  totalInterestRate: number;
  lastUpdate: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function InterestRateSection({
  baseRate,
  bankMargin,
  onBankMarginChange,
  totalInterestRate,
  lastUpdate,
  onRefresh,
  isLoading
}: InterestRateSectionProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const handleBankMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 5) {
      onBankMarginChange(value);
    }
  };
  
  return (
    <div className="mb-6">
      <h3 className="text-md font-medium mb-3">{t.interestRateTitle}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Base Interest Rate */}
        <div>
          <label className="block text-text-secondary text-sm mb-1" htmlFor="base-rate">
            {t.baseRate}
            <span className="text-xs text-primary ml-1">{t.baseRateAutoUpdate}</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <Input
              id="base-rate"
              type="text"
              className="py-3 px-4 bg-gray-50"
              value={`${baseRate}%`}
              readOnly
            />
            <Button 
              className="absolute inset-y-0 right-0 px-3 flex items-center bg-primary text-white rounded-r-md"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-1">{t.lastUpdate} {lastUpdate}</p>
        </div>
        
        {/* Bank Margin */}
        <div>
          <label className="block text-text-secondary text-sm mb-1" htmlFor="bank-margin">
            {t.bankMargin}
          </label>
          <div className="relative rounded-md shadow-sm">
            <Input
              id="bank-margin"
              type="number"
              className="py-3 pl-4 pr-10"
              placeholder="2.00"
              value={bankMargin}
              onChange={handleBankMarginChange}
              min={0}
              max={5}
              step={0.01}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Interest Rate */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="flex justify-between items-center">
          <span className="text-sm">{t.totalInterestRate}</span>
          <span className="text-lg font-medium text-primary">{totalInterestRate.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  );
}
