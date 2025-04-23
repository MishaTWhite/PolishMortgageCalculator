import { Slider } from "@/components/ui/slider";

interface LoanDurationSliderProps {
  value: number;
  onChange: (value: number) => void;
}

export default function LoanDurationSlider({ value, onChange }: LoanDurationSliderProps) {
  
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-1">
        <label className="block text-text-secondary text-sm" htmlFor="loan-duration">
          Okres kredytowania
        </label>
        <span className="text-sm font-medium">
          {value} lat
        </span>
      </div>
      <Slider
        id="loan-duration"
        value={[value]}
        min={5}
        max={35}
        step={1}
        className="w-full mt-2"
        onValueChange={handleSliderChange}
      />
      <div className="flex justify-between text-xs text-text-tertiary mt-1">
        <span>5 lat</span>
        <span>35 lat</span>
      </div>
    </div>
  );
}
