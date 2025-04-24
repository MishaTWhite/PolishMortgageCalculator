import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import LanguageSelector from "@/components/LanguageSelector";
import { format } from "date-fns";
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface YearData {
  age: number;
  startingCapital: number;
  yearlyInvestment: number;
  capitalGrowth: number;
  monthlyIncome: number;
  inflationAdjustedCapital: number;
  inflationAdjustedIncome: number;
}

export default function InvestmentCalculator() {
  const { language } = useLanguage();
  const t = useTranslations(language);
  
  // State for input values
  const [startingAge, setStartingAge] = useState(30);
  const [initialCapital, setInitialCapital] = useState(10000);
  const [monthlyInvestment, setMonthlyInvestment] = useState(1000);
  const [annualReturn, setAnnualReturn] = useState(7);
  const [inflation, setInflation] = useState(2.5);
  const [considerInflation, setConsiderInflation] = useState(false);
  const [endAge, setEndAge] = useState(60);
  
  // Derived state
  const [yearlyData, setYearlyData] = useState<YearData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Calculate investment results
  useEffect(() => {
    // Investment period in years
    const investmentPeriod = endAge - startingAge;
    if (investmentPeriod <= 0) return;
    
    // Calculate yearly data
    const data: YearData[] = [];
    const chartPoints: any[] = [];
    
    let projectedCapital = initialCapital;
    let currentMonthlyInvestment = monthlyInvestment;
    
    // Calculate for investment period and limited projection period
    const projectionYears = Math.max(5, Math.floor(investmentPeriod * 0.25)); // ~25% projection period
    for (let year = 0; year <= investmentPeriod + projectionYears; year++) {
      const age = startingAge + year;
      const isActiveInvestment = year <= investmentPeriod;
      
      // Yearly investment is monthly * 12
      const yearlyInvestmentAmount = isActiveInvestment ? currentMonthlyInvestment * 12 : 0;
      
      // Calculate capital growth based on total amount
      const totalForYear = projectedCapital + yearlyInvestmentAmount;
      const yearlyGrowth = totalForYear * (annualReturn / 100);
      
      // Update capital for next year
      const endCapital = totalForYear + yearlyGrowth;
      
      // Calculate monthly passive income
      const monthlyIncomeValue = endCapital * (annualReturn / 100) / 12;
      
      // Inflation adjustment factor for all previous years
      const inflationFactor = Math.pow(1 + inflation / 100, -year);
      
      // Inflation adjusted values
      const inflationAdjustedCapitalValue = endCapital * inflationFactor;
      const inflationAdjustedIncomeValue = monthlyIncomeValue * inflationFactor;
      
      // Include all active investment years plus just a couple years of projection in the table
      if (year <= investmentPeriod || (year > investmentPeriod && year <= investmentPeriod + 2)) {
        // Store data for table
        const yearData: YearData = {
          age,
          startingCapital: Math.round(projectedCapital),
          yearlyInvestment: isActiveInvestment ? Math.round(yearlyInvestmentAmount) : 0,
          capitalGrowth: Math.round(yearlyGrowth),
          monthlyIncome: Math.round(monthlyIncomeValue),
          inflationAdjustedCapital: Math.round(inflationAdjustedCapitalValue),
          inflationAdjustedIncome: Math.round(inflationAdjustedIncomeValue)
        };
        data.push(yearData);
      }
      
      // Store data for chart (including projection after investment period)
      // Store values in appropriate properties based on investment phase
      chartPoints.push({
        age,
        // For active investment period, store in main properties
        capital: isActiveInvestment ? Math.round(endCapital) : null,
        adjustedCapital: isActiveInvestment ? Math.round(inflationAdjustedCapitalValue) : null,
        // For projection period, store in separate properties
        projectedCapital: !isActiveInvestment ? Math.round(endCapital) : null,
        projectedAdjustedCapital: !isActiveInvestment ? Math.round(inflationAdjustedCapitalValue) : null
      });
      
      // Update for next year
      projectedCapital = endCapital;
      
      // Increase monthly investment with inflation if enabled
      if (considerInflation && isActiveInvestment) {
        currentMonthlyInvestment *= (1 + inflation / 100);
      }
    }
    
    setYearlyData(data);
    setChartData(chartPoints);
  }, [startingAge, initialCapital, monthlyInvestment, annualReturn, inflation, considerInflation, endAge]);
  
  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : language === 'ua' ? 'uk-UA' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Calculate summary data
  const investmentPeriod = endAge - startingAge;
  const totalInvestment = initialCapital + (monthlyInvestment * 12 * investmentPeriod);
  const finalCapital = yearlyData.length > 0 ? yearlyData[investmentPeriod]?.startingCapital + yearlyData[investmentPeriod]?.yearlyInvestment + yearlyData[investmentPeriod]?.capitalGrowth : 0;
  const monthlyPassiveIncome = yearlyData.length > 0 ? yearlyData[investmentPeriod]?.monthlyIncome : 0;
  const inflationAdjustedCapital = yearlyData.length > 0 ? yearlyData[investmentPeriod]?.inflationAdjustedCapital : 0;
  const inflationAdjustedIncome = yearlyData.length > 0 ? yearlyData[investmentPeriod]?.inflationAdjustedIncome : 0;
  
  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.investmentCalculator}</h1>
            <p className="text-text-secondary">{t.investmentCalculatorDescription}</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-end gap-3">
            <Link href="/">
              <Button variant="outline" className="mb-2 sm:mb-0 flex items-center gap-2 whitespace-nowrap">
                <ArrowLeft size={16} />
                {language === 'ua' ? 'Іпотечний калькулятор' : 
                 language === 'pl' ? 'Kalkulator hipoteczny' : 
                 'Mortgage Calculator'}
              </Button>
            </Link>
            <LanguageSelector />
          </div>
        </header>
        
        {/* Desktop layout: Parameters, Graph, Summary then Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input parameters - 4 columns on desktop, first on mobile */}
          <div className="lg:col-span-4 lg:row-start-1 lg:col-start-1 order-1">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">{t.investmentParameters}</h2>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="startingAge">{t.startingAge}</Label>
                    <div className="flex gap-4">
                      <Slider 
                        id="startingAge"
                        value={[startingAge]} 
                        min={18} 
                        max={64} 
                        step={1}
                        className="flex-1"
                        onValueChange={(value) => setStartingAge(value[0])}
                      />
                      <div className="w-16 flex items-center justify-end">
                        <Input 
                          type="number" 
                          value={startingAge} 
                          onChange={(e) => setStartingAge(parseInt(e.target.value) || 18)}
                          min={18}
                          max={64}
                          className="w-full text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="initialCapital">{t.initialCapital}</Label>
                    <Input 
                      id="initialCapital"
                      type="number" 
                      value={initialCapital} 
                      onChange={(e) => setInitialCapital(parseFloat(e.target.value) || 0)}
                      min={0}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthlyInvestment">{t.monthlyInvestment}</Label>
                    <Input 
                      id="monthlyInvestment"
                      type="number" 
                      value={monthlyInvestment} 
                      onChange={(e) => setMonthlyInvestment(parseFloat(e.target.value) || 0)}
                      min={0}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="annualReturn">{t.annualReturn}</Label>
                    <div className="flex gap-4">
                      <Slider 
                        id="annualReturn"
                        value={[annualReturn]} 
                        min={1} 
                        max={30} 
                        step={0.5}
                        className="flex-1"
                        onValueChange={(value) => setAnnualReturn(value[0])}
                      />
                      <div className="w-16 flex items-center justify-end">
                        <Input 
                          type="number" 
                          value={annualReturn} 
                          onChange={(e) => setAnnualReturn(parseFloat(e.target.value) || 1)}
                          min={1}
                          max={30}
                          step={0.5}
                          className="w-full text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="inflation">{t.inflation}</Label>
                    <div className="flex gap-4">
                      <Slider 
                        id="inflation"
                        value={[inflation]} 
                        min={0} 
                        max={10} 
                        step={0.1}
                        className="flex-1"
                        onValueChange={(value) => setInflation(value[0])}
                      />
                      <div className="w-16 flex items-center justify-end">
                        <Input 
                          type="number" 
                          value={inflation} 
                          onChange={(e) => setInflation(parseFloat(e.target.value) || 0)}
                          min={0}
                          max={10}
                          step={0.1}
                          className="w-full text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="considerInflation" 
                      checked={considerInflation}
                      onCheckedChange={(checked) => 
                        setConsiderInflation(checked === true)}
                    />
                    <Label htmlFor="considerInflation" className="text-sm font-normal cursor-pointer">
                      {t.considerInflation}
                    </Label>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endAge">{t.endAge}</Label>
                    <div className="flex gap-4">
                      <Slider 
                        id="endAge"
                        value={[endAge]} 
                        min={Math.min(65, startingAge + 1)} 
                        max={65} 
                        step={1}
                        className="flex-1"
                        onValueChange={(value) => setEndAge(value[0])}
                      />
                      <div className="w-16 flex items-center justify-end">
                        <Input 
                          type="number" 
                          value={endAge} 
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || startingAge + 1;
                            setEndAge(Math.max(startingAge + 1, Math.min(65, value)));
                          }}
                          min={startingAge + 1}
                          max={65}
                          className="w-full text-right"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart - 8 columns on desktop, third on mobile */}
          <div className="lg:col-span-8 lg:row-start-1 lg:col-start-5 order-3">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">{t.capitalGrowth}</h2>
                
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="age" 
                        label={{ value: t.age, position: 'bottom', offset: 0 }} 
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value)]}
                        labelFormatter={(value) => `${t.age}: ${value}`}
                      />
                      <Legend />
                      {/* Active investment period - solid lines */}
                      <Line 
                        name={t.finalCapital}
                        type="monotone" 
                        dataKey="capital" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 8 }}
                        connectNulls
                      />
                      
                      {(inflation > 0 && considerInflation) && (
                        <Line 
                          name={t.inflationAdjustedCapital}
                          type="monotone" 
                          dataKey="adjustedCapital" 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      )}
                      
                      {/* Projection period - dashed lines */}
                      <Line 
                        name={`${t.finalCapital} (projection)`}
                        type="monotone" 
                        dataKey="projectedCapital"
                        stroke="#8884d8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={{ r: 8 }}
                        connectNulls
                        legendType="none"
                      />
                      
                      {(inflation > 0 && considerInflation) && (
                        <Line 
                          name={`${t.inflationAdjustedCapital} (projection)`}
                          type="monotone" 
                          dataKey="projectedAdjustedCapital"
                          stroke="#82ca9d" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={{ r: 6 }}
                          connectNulls
                          legendType="none"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <p className="text-xs text-text-secondary mt-2">
                  {t.projectionNote}
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Summary box - 8 columns on desktop (same width as chart), positioned below the chart box on desktop, second on mobile */}
          <div className="lg:col-span-8 lg:row-start-2 lg:col-start-5 order-2">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">{t.summary}</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">{t.investmentPeriod}:</span>
                    <span className="font-medium">{investmentPeriod} {t.years}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">{t.totalInvestment}:</span>
                    <span className="font-medium">{formatCurrency(totalInvestment)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">{t.finalCapital}:</span>
                    <span className="font-medium">{formatCurrency(finalCapital)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm">{t.monthlyPassiveIncome}:</span>
                    <span className="font-medium">{formatCurrency(monthlyPassiveIncome)}</span>
                  </div>
                  
                  {(inflation > 0 && considerInflation) && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm">{t.inflationAdjustedCapital}:</span>
                        <span className="font-medium">{formatCurrency(inflationAdjustedCapital)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm">{t.inflationAdjustedIncome}:</span>
                        <span className="font-medium">{formatCurrency(inflationAdjustedIncome)}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Table - Full width (12 columns) on desktop */}
          <div className="lg:col-span-12 lg:row-start-3 order-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">{t.yearlyData}</h2>
                
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">{t.age}</TableHead>
                        <TableHead>{t.startingCapital}</TableHead>
                        <TableHead>{t.yearlyInvestment}</TableHead>
                        <TableHead>{t.capitalGrowthAmount}</TableHead>
                        <TableHead>{t.monthlyPassiveIncome}</TableHead>
                        {(inflation > 0 && considerInflation) && (
                          <>
                            <TableHead>{`${t.finalCapital} (${t.inflationAdjusted})`}</TableHead>
                            <TableHead>{`${t.monthlyPassiveIncome} (${t.inflationAdjusted})`}</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearlyData.map((year, index) => (
                        <TableRow key={index} className={year.age === endAge ? "bg-primary/10" : ""}>
                          <TableCell className="font-medium">{year.age}</TableCell>
                          <TableCell>{formatCurrency(year.startingCapital)}</TableCell>
                          <TableCell>{formatCurrency(year.yearlyInvestment)}</TableCell>
                          <TableCell>{formatCurrency(year.capitalGrowth)}</TableCell>
                          <TableCell>{formatCurrency(year.monthlyIncome)}</TableCell>
                          {(inflation > 0 && considerInflation) && (
                            <>
                              <TableCell>{formatCurrency(year.inflationAdjustedCapital)}</TableCell>
                              <TableCell>{formatCurrency(year.inflationAdjustedIncome)}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                <p className="text-xs text-text-tertiary mt-4">
                  {t.calculationNote}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <footer className="text-center text-text-tertiary text-sm mt-6">
          <p>© {new Date().getFullYear()} {t.footerText} {format(new Date(), "dd.MM.yyyy")}</p>
        </footer>
      </div>
    </div>
  );
}