import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/mortgageCalculator";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";

interface MonthlyPaymentSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  currencySymbol?: string;
  currencyCode?: string;
  formatAmount?: (amount: number) => string;
}

export default function MonthlyPaymentSlider({ 
  value, 
  onChange, 
  min, 
  max,
  currencySymbol = "zł",
  currencyCode = "PLN",
  formatAmount = formatCurrency
}: MonthlyPaymentSliderProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-text-secondary text-sm" htmlFor="monthly-payment">
          {t.monthlyPayment}
        </label>
        <span className="text-sm font-medium">
          {currencyCode} {formatAmount(value)}
        </span>
      </div>
      <Slider
        id="monthly-payment"
        value={[value]}
        min={min}
        max={max}
        step={10}
        className="w-full mt-2"
        onValueChange={handleSliderChange}
      />
      <div className="flex justify-between text-xs text-text-tertiary mt-1">
        <span>{currencyCode} {formatAmount(min)}</span>
        <span>{currencyCode} {formatAmount(max)}</span>
      </div>
    </div>
  );
}
