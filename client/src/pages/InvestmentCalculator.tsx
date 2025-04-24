import { useState, useEffect } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import LanguageSelector from "@/components/LanguageSelector";
import CalcNavigation from "@/components/CalcNavigation";
import { format } from "date-fns";
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, ResponsiveContainer, ReferenceLine } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

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
  const [reinvestIncome, setReinvestIncome] = useState(true);
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
    
    // Calculate for investment period and extended projection period
    const projectionYears = Math.max(8, Math.floor(investmentPeriod * 0.33)); // ~33% projection period
    for (let year = 0; year <= investmentPeriod + projectionYears; year++) {
      const age = startingAge + year;
      const isActiveInvestment = year <= investmentPeriod;
      
      // Yearly investment is monthly * 12
      const yearlyInvestmentAmount = isActiveInvestment ? currentMonthlyInvestment * 12 : 0;
      
      // Calculate capital growth based on total amount
      const totalForYear = projectedCapital + yearlyInvestmentAmount;
      const yearlyGrowth = totalForYear * (annualReturn / 100);
      
      // Update capital for next year based on whether we reinvest passive income in projection period
      let endCapital;
      if (!isActiveInvestment && !reinvestIncome) {
        // In projection period with income spent (not reinvested):
        // Capital remains the same, growth is not added to capital for next year
        // When spending passive income, capital stays constant
        endCapital = totalForYear; // Only yearly investment (which is 0 here) is added, no growth
      } else {
        // During active investment or in projection period with reinvested income:
        // Capital grows with compound interest
        endCapital = totalForYear + yearlyGrowth;
      }
      
      // Calculate monthly passive income
      const monthlyIncomeValue = totalForYear * (annualReturn / 100) / 12;
      
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
  }, [startingAge, initialCapital, monthlyInvestment, annualReturn, inflation, considerInflation, reinvestIncome, endAge]);
  
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
        <header className="mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">{t.investmentCalculator}</h1>
            <p className="text-text-secondary">{t.investmentCalculatorDescription}</p>
          </div>
        </header>

        <CalcNavigation />
        
        <div className="flex justify-end mt-4 mb-6">
          <LanguageSelector />
        </div>
        
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
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="reinvestIncome" 
                      checked={reinvestIncome}
                      onCheckedChange={(checked) => 
                        setReinvestIncome(checked === true)}
                    />
                    <Label htmlFor="reinvestIncome" className="text-sm font-normal cursor-pointer">
                      {t.reinvestIncomeInProjection || "Reinvest income in projection period"}
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
                
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="age" 
                        label={{ value: t.age, position: 'bottom', offset: 25 }}
                        // Показываем все возрасты на оси X
                        tick={{ fontSize: 10 }} 
                        tickMargin={10} // Больше места для подписей
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: number, name: string, props: any) => {
                          // Добавляем правильные подписи для всех типов данных
                          const dataKey = props.dataKey;
                          
                          if (dataKey === "projectedCapital") {
                            // Пишем "прогноз" или "projection" вместо системного названия
                            return [`${formatCurrency(value)} (${t.finalCapital}, ${language === 'pl' ? 'prognoza' : language === 'ua' ? 'прогноз' : 'forecast'})`];
                          } else if (dataKey === "projectedAdjustedCapital") {
                            return [`${formatCurrency(value)} (${t.inflationAdjustedCapital}, ${language === 'pl' ? 'prognoza' : language === 'ua' ? 'прогноз' : 'forecast'})`];
                          }
                          
                          return [formatCurrency(value)];
                        }}
                        labelFormatter={(value) => {
                          // Highlight key ages in tooltip
                          if (value === endAge) {
                            return `${t.age}: ${value} (${t.endAge})`;
                          }
                          return `${t.age}: ${value}`;
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: '10px',
                          paddingBottom: '10px' 
                        }}
                        iconType="circle" 
                        layout="horizontal"
                        verticalAlign="top" // Переместим легенду вверх
                        align="center"
                        iconSize={10}
                        formatter={(value) => {
                          // Добавляем дополнительные пробелы между элементами легенды
                          return <span style={{ marginRight: '20px', marginLeft: '20px' }}>{value}</span>;
                        }}
                      />
                      {/* Active investment period - solid lines */}
                      <Line 
                        name={t.finalCapital}
                        type="monotone" 
                        dataKey="capital" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        dot={false} // No dots for cleaner look
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                      
                      {/* Highlighting the end age in tooltip is better than using reference line */}
                      
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
                        type="monotone" 
                        dataKey="projectedCapital"
                        stroke="#8884d8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ r: 0 }} // Hide regular dots
                        isAnimationActive={false} // Disable animation for better performance
                        activeDot={{ r: 8 }}
                        connectNulls
                        legendType="none" // Скрываем из легенды
                      />
                      
                      {(inflation > 0 && considerInflation) && (
                        <Line 
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
                
                <p className="text-xs text-text-secondary mt-2 mb-6">
                  {t.projectionNote}
                </p>

                {/* Summary inside the chart card */}
                <Separator className="my-4" />
                
                <h2 className="text-lg font-medium my-4">{t.summary}</h2>
                
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
          
          {/* Empty space for mobile layout */}
          <div className="hidden lg:hidden order-2"></div>
          
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