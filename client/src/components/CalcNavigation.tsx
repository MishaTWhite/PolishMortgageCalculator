import { Link, useLocation } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CalcNavigation() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  const [location] = useLocation();
  
  // Determine active tab based on current location
  const getActiveTab = () => {
    if (location === "/") return "mortgage";
    if (location === "/investment") return "investment";
    if (location === "/currency") return "currency";
    return "mortgage"; // Default
  };
  
  return (
    <div className="w-full flex justify-center mb-6">
      <Tabs defaultValue={getActiveTab()} className="w-full max-w-md">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="mortgage" asChild>
            <Link href="/" className="w-full">
              {t.mortgageCalculator}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="investment" asChild>
            <Link href="/investment" className="w-full">
              {t.investmentCalculator}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="currency" asChild>
            <Link href="/currency" className="w-full">
              {t.currencyConverter}
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}