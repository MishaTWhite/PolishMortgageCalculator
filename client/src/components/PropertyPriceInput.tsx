import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { formatCurrency } from "@/lib/mortgageCalculator";

interface PropertyPriceInputProps {
  value: number;
  onChange: (value: number) => void;
  currencySymbol?: string;
  currencyCode?: string;
  formatAmount?: (amount: number) => string;
}

export default function PropertyPriceInput({ 
  value, 
  onChange, 
  currencySymbol = "zł", 
  currencyCode = "PLN",
  formatAmount = formatCurrency 
}: PropertyPriceInputProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [inputValue, setInputValue] = useState(value.toString());
  
  // Update input value when the currency or value changes
  useEffect(() => {
    setInputValue(value.toString());
  }, [value, currencyCode]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Convert to number and validate
    const numValue = Number(newValue);
    // The min/max range should be adjusted based on currency
    const minValue = currencyCode === "PLN" ? 50000 : 10000;
    const maxValue = currencyCode === "PLN" ? 10000000 : 2000000;
    
    if (!isNaN(numValue) && numValue >= minValue && numValue <= maxValue) {
      onChange(numValue);
    }
  };
  
  // Format on blur for better user experience
  const handleBlur = () => {
    const numValue = Number(inputValue);
    if (!isNaN(numValue)) {
      // Constrain to valid range - adjusted for currency
      const minValue = currencyCode === "PLN" ? 50000 : 10000;
      const maxValue = currencyCode === "PLN" ? 10000000 : 2000000;
      
      const constrainedValue = Math.max(minValue, Math.min(maxValue, numValue));
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
        {t.propertyPrice}
      </label>
      <div className="relative mt-1 rounded-md shadow-sm">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 sm:text-sm">{currencyCode}</span>
        </div>
        <Input
          id="property-price"
          type="number"
          className="pl-12 pr-12 py-3"
          placeholder={currencyCode === "PLN" ? "500,000" : "100,000"}
          value={inputValue}
          onChange={handleChange}
          onBlur={handleBlur}
          min={currencyCode === "PLN" ? 50000 : 10000}
          max={currencyCode === "PLN" ? 10000000 : 2000000}
        />
      </div>
    </div>
  );
}
