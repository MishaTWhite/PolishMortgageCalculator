import { useState } from "react";
import { Input } from "@/components/ui/input";

interface PropertyPriceInputProps {
  value: number;
  onChange: (value: number) => void;
}

export default function PropertyPriceInput({ value, onChange }: PropertyPriceInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Convert to number and validate
    const numValue = Number(newValue);
    if (!isNaN(numValue) && numValue >= 50000 && numValue <= 10000000) {
      onChange(numValue);
    }
  };
  
  // Format on blur for better user experience
  const handleBlur = () => {
    const numValue = Number(inputValue);
    if (!isNaN(numValue)) {
      // Constrain to valid range
      const constrainedValue = Math.max(50000, Math.min(10000000, numValue));
      onChange(constrainedValue);
      setInputValue(constrainedValue.toString());
    } else {
      // Revert to previous valid value
      setInputValue(value.toString());
    }
  };
  
  return (
    <div className="mb-6">
      <label className="block text-text-secondary text-sm mb-1" htmlFor="property-price">
        Cena nieruchomości
      </label>
      <div className="relative mt-1 rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">PLN</span>
        </div>
        <Input
          id="property-price"
          type="number"
          className="pl-12 pr-12 py-3"
          placeholder="500,000"
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={50000}
          max={10000000}
        />
      </div>
    </div>
  );
}
