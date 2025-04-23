import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/mortgageCalculator";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";

interface DownPaymentSliderProps {
  value: number;
  onChange: (value: number) => void;
  downPaymentAmount: number;
}

export default function DownPaymentSlider({ 
  value, 
  onChange, 
  downPaymentAmount 
}: DownPaymentSliderProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-text-secondary text-sm" htmlFor="down-payment-percent">
          {t.downPayment}
        </label>
        <span className="text-sm font-medium">
          PLN {formatCurrency(downPaymentAmount)} ({value}%)
        </span>
      </div>
      <Slider
        id="down-payment-percent"
        value={[value]}
        min={10}
        max={90}
        step={1}
        className="w-full mt-2"
        onValueChange={handleSliderChange}
      />
      <div className="flex justify-between text-xs text-text-tertiary mt-1">
        <span>10%</span>
        <span>90%</span>
      </div>
    </div>
  );
}
