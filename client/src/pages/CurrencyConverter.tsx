import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import LanguageSelector from "@/components/LanguageSelector";
import CalcNavigation from "@/components/CalcNavigation";
import CurrencyConverter from "@/components/CurrencyConverter";
import { format } from "date-fns";

export default function CurrencyConverterPage() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.currencyConverter}</h1>
            <p className="text-text-secondary">{t.currencyConverterDescription}</p>
          </div>
        </header>

        <CalcNavigation />
        
        <div className="flex justify-end mt-4 mb-6">
          <LanguageSelector />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <CurrencyConverter />
        </div>
        
        <footer className="text-center text-text-tertiary text-sm mt-6">
          <p>© {new Date().getFullYear()} {t.footerText} {format(new Date(), "dd.MM.yyyy")}</p>
        </footer>
      </div>
    </div>
  );
}