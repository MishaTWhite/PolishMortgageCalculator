import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Calculator, DollarSign, BarChart, Home, LineChart } from "lucide-react";

export default function CalcNavigation() {
  const [location] = useLocation();
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <Link href="/">
        <Button
          variant={location === "/" ? "default" : "outline"}
          className="flex items-center gap-2"
          size="sm"
        >
          <Calculator size={16} />
          {t.mortgageCalculator}
        </Button>
      </Link>
      
      <Link href="/investment">
        <Button
          variant={location === "/investment" ? "default" : "outline"}
          className="flex items-center gap-2"
          size="sm"
        >
          <BarChart size={16} />
          {t.investmentCalculator}
        </Button>
      </Link>
      
      <Link href="/converter">
        <Button
          variant={location === "/converter" ? "default" : "outline"}
          className="flex items-center gap-2"
          size="sm"
        >
          <DollarSign size={16} />
          {t.currencyConverter}
        </Button>
      </Link>
      
      <Link href="/property-market-analysis">
        <Button
          variant={location === "/property-market-analysis" ? "default" : "outline"}
          className="flex items-center gap-2"
          size="sm"
        >
          <Home size={16} />
          {t.propertyMarketAnalysis || "Property Market"}
        </Button>
      </Link>
      
      <Link href="/property-statistics">
        <Button
          variant={location === "/property-statistics" ? "default" : "outline"}
          className="flex items-center gap-2"
          size="sm"
        >
          <LineChart size={16} />
          {t.propertyStatistics || "Property Statistics"}
        </Button>
      </Link>
    </div>
  );
}