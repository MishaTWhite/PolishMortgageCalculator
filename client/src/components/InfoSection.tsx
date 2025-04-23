import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";

export default function InfoSection() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h2 className="text-lg font-medium mb-4">{t.howItWorksTitle}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-medium mb-2">{t.inputDataTitle}</h3>
            <ul className="list-disc list-inside text-sm space-y-2 text-text-secondary">
              <li>{t.enterPropertyPrice}</li>
              <li>{t.setDownPayment}</li>
              <li>{t.chooseLoanPeriod}</li>
              <li>{t.baseRateInfo}</li>
              <li>{t.adjustBankMargin}</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-md font-medium mb-2">{t.formulaTitle}</h3>
            <p className="text-sm text-text-secondary mb-2">
              {t.formulaDescription}
            </p>
            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm font-mono">
                R = K × (r / 12) × (1 + r / 12)<sup>n</sup> / ((1 + r / 12)<sup>n</sup> - 1)
              </p>
              <p className="text-xs text-text-tertiary mt-2">
                {t.formulaWhere}<br />
                {t.formulaMonthlyPayment}<br />
                {t.formulaLoanAmount}<br />
                {t.formulaAnnualRate}<br />
                {t.formulaPaymentsNumber}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
