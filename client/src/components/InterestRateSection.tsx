import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RefreshCw, Info, Building } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BankOffer {
  bankName: string;
  bankMargin: number;
  wiborType: string;
  totalRate: number;
  additionalInfo?: string;
}

interface InterestRateSectionProps {
  baseRate: number;
  bankMargin: number;
  onBankMarginChange: (value: number) => void;
  totalInterestRate: number;
  lastUpdate: string;
  onRefresh: () => void;
  isLoading: boolean;
  wiborRates?: Record<string, number>;
  wiborLastUpdate?: string;
  bankOffers?: BankOffer[];
  bankOffersLastUpdate?: string;
  // Новые properties для выбора WIBOR и банка
  onSelectWibor?: (wiborType: string, rate: number) => void;
  onSelectBank?: (bankName: string, bankMargin: number, wiborType: string, wiborRate: number) => void;
  selectedWiborType?: string;
}

export default function InterestRateSection({
  baseRate,
  bankMargin,
  onBankMarginChange,
  totalInterestRate,
  lastUpdate,
  onRefresh,
  isLoading,
  wiborRates,
  wiborLastUpdate,
  bankOffers,
  bankOffersLastUpdate,
  onSelectWibor,
  onSelectBank,
  selectedWiborType
}: InterestRateSectionProps) {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  const handleBankMarginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 5) {
      onBankMarginChange(value);
    }
  };
  
  return (
    <div className="mb-6">
      <h3 className="text-md font-medium mb-3">{t.interestRateTitle}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Base Interest Rate */}
        <div>
          <label className="block text-text-secondary text-sm mb-1" htmlFor="base-rate">
            {t.baseRate}
            <span className="text-xs text-primary ml-1">{t.baseRateAutoUpdate}</span>
          </label>
          <div className="relative rounded-md shadow-sm">
            <Input
              id="base-rate"
              type="text"
              className="py-3 px-4 bg-gray-50"
              value={`${baseRate}%`}
              readOnly
            />
            <Button 
              className="absolute inset-y-0 right-0 px-3 flex items-center bg-primary text-white rounded-r-md"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </Button>
          </div>
          <p className="text-xs text-text-tertiary mt-1">{t.lastUpdate} {lastUpdate}</p>
        </div>
        
        {/* Bank Margin */}
        <div>
          <label className="block text-text-secondary text-sm mb-1" htmlFor="bank-margin">
            {t.bankMargin}
          </label>
          <div className="relative rounded-md shadow-sm">
            <Input
              id="bank-margin"
              type="number"
              className="py-3 pl-4 pr-10"
              placeholder="2.00"
              value={bankMargin}
              onChange={handleBankMarginChange}
              min={0}
              max={5}
              step={0.01}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm">%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Total Interest Rate */}
      <div className="mt-4 p-3 bg-gray-50 rounded-md">
        <div className="flex flex-col">
          <div className="flex justify-between items-center">
            <span className="text-sm">{t.totalInterestRate}</span>
            <span className="text-lg font-medium text-primary">{totalInterestRate.toFixed(2)}%</span>
          </div>
          {selectedWiborType && (
            <div className="text-xs text-muted-foreground mt-1">
              {`Based on WIBOR ${selectedWiborType} (${wiborRates?.[selectedWiborType]?.toFixed(2) || "?"}%) + Bank Margin (${bankMargin.toFixed(2)}%)`}
            </div>
          )}
        </div>
      </div>
      
      {/* WIBOR Rates */}
      {wiborRates && (
        <Card className="mt-5">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <Info className="h-4 w-4 mr-2 text-blue-500" />
              <CardTitle className="text-md">WIBOR Rates</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Source: {wiborLastUpdate ? `Last updated: ${wiborLastUpdate}` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(wiborRates).map(([term, rate]) => (
                <div 
                  key={term} 
                  className={`border rounded-md p-3 text-center cursor-pointer hover:bg-gray-50 transition-colors ${selectedWiborType === term ? 'border-primary bg-primary/5' : ''}`}
                  onClick={() => onSelectWibor && onSelectWibor(term, rate)}
                >
                  <div className="text-sm text-muted-foreground">WIBOR {term}</div>
                  <div className="text-lg font-medium text-primary">{rate.toFixed(2)}%</div>
                  {selectedWiborType === term && (
                    <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary">
                      Selected
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Bank Offers */}
      {bankOffers && bankOffers.length > 0 && (
        <Card className="mt-5">
          <CardHeader className="pb-3">
            <div className="flex items-center">
              <Building className="h-4 w-4 mr-2 text-green-500" />
              <CardTitle className="text-md">Bank Mortgage Offers</CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Source: Market Research {bankOffersLastUpdate ? `(Last updated: ${bankOffersLastUpdate})` : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bank</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Base Rate</TableHead>
                  <TableHead>Total Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bankOffers.map((offer, index) => (
                  <TableRow 
                    key={index} 
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      // Найдем соответствующую ставку WIBOR, если она доступна
                      if (onSelectBank && wiborRates && wiborRates[offer.wiborType]) {
                        onSelectBank(
                          offer.bankName, 
                          offer.bankMargin, 
                          offer.wiborType, 
                          wiborRates[offer.wiborType]
                        );
                      }
                    }}
                  >
                    <TableCell className="font-medium">{offer.bankName}</TableCell>
                    <TableCell>{offer.bankMargin.toFixed(2)}%</TableCell>
                    <TableCell>WIBOR {offer.wiborType}</TableCell>
                    <TableCell className="text-primary font-semibold">{offer.totalRate.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 text-xs text-muted-foreground">
              <p>* The actual rate may vary depending on your credit score, loan amount, and other factors.</p>
              {bankMargin > 0 && (
                <div className="mt-2 p-2 bg-secondary/20 rounded-md">
                  <p className="font-medium">
                    Your current rate: {totalInterestRate.toFixed(2)}% 
                    ({selectedWiborType ? `WIBOR ${selectedWiborType}` : "NBP Reference Rate"} + {bankMargin.toFixed(2)}% margin)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
