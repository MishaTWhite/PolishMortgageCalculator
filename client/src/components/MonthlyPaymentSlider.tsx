import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/mortgageCalculator";

interface MonthlyPaymentSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
}

export default function MonthlyPaymentSlider({ 
  value, 
  onChange, 
  min, 
  max 
}: MonthlyPaymentSliderProps) {
  
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-text-secondary text-sm" htmlFor="monthly-payment">
          Miesięczna rata
        </label>
        <span className="text-sm font-medium">
          PLN {formatCurrency(value)}
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
        <span>PLN {formatCurrency(min)}</span>
        <span>PLN {formatCurrency(max)}</span>
      </div>
    </div>
  );
}
