import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { useTranslations } from "@/lib/translations";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

// Определение типа для данных года
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
  
  // Входные параметры
  const [startAge, setStartAge] = useState(30);
  const [initialCapital, setInitialCapital] = useState(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(10.5);
  const [inflation, setInflation] = useState(2.5);
  const [considerInflation, setConsiderInflation] = useState(false);
  const [endAge, setEndAge] = useState(65);
  
  // Данные для расчетов и графика
  const [yearlyData, setYearlyData] = useState<YearData[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Расчет всех данных при изменении любого параметра
  useEffect(() => {
    calculateInvestment();
  }, [startAge, initialCapital, monthlyInvestment, annualReturn, inflation, considerInflation, endAge]);
  
  // Основная функция расчета
  const calculateInvestment = () => {
    const years = endAge - startAge + 1;
    const data: YearData[] = [];
    const chartDataArray: any[] = [];
    
    let capital = initialCapital;
    let yearlyInvestmentAmount = monthlyInvestment * 12;
    let inflationFactor = 1;
    
    for (let i = 0; i < years + 20; i++) {
      const age = startAge + i;
      const isAccumulationPhase = i < years;
      
      // Расчет с учетом инфляции, если опция включена
      if (considerInflation && i > 0) {
        inflationFactor *= (1 + inflation / 100);
        if (isAccumulationPhase) {
          yearlyInvestmentAmount = monthlyInvestment * 12 * inflationFactor;
        }
      }
      
      // Если период накопления закончился, больше не инвестируем
      const currentYearInvestment = isAccumulationPhase ? yearlyInvestmentAmount : 0;
      
      // Рост капитала (начисляется на весь капитал и новые инвестиции)
      const growth = (capital + currentYearInvestment) * (annualReturn / 100);
      
      // Новый капитал с учетом инвестиций и роста
      const newCapital = capital + currentYearInvestment + growth;
      
      // Ежемесячный доход от инвестиций
      const monthlyIncome = newCapital * (annualReturn / 100) / 12;
      
      // Расчет с учетом инфляции
      const realCapital = newCapital / inflationFactor;
      const realMonthlyIncome = monthlyIncome / inflationFactor;
      
      // Добавляем данные за год
      if (i < years || i % 5 === 0) { // Для графика после периода накопления берем точки каждые 5 лет
        const yearData: YearData = {
          age,
          startingCapital: Math.round(capital),
          yearlyInvestment: Math.round(currentYearInvestment),
          capitalGrowth: Math.round(growth),
          monthlyIncome: Math.round(monthlyIncome),
          inflationAdjustedCapital: Math.round(realCapital),
          inflationAdjustedIncome: Math.round(realMonthlyIncome)
        };
        
        // Для таблицы добавляем только период накопления
        if (i < years) {
          data.push(yearData);
        }
        
        // Для графика добавляем все данные
        chartDataArray.push({
          age,
          capital: Math.round(newCapital),
          realCapital: Math.round(realCapital),
          isProjection: !isAccumulationPhase
        });
      }
      
      // Устанавливаем новый капитал для следующего года
      capital = newCapital;
    }
    
    setYearlyData(data);
    setChartData(chartDataArray);
  };
  
  // Функция форматирования чисел
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === 'pl' ? 'pl-PL' : language === 'ua' ? 'uk-UA' : 'en-US', {
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="bg-gray-100 font-sans text-text-primary">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-medium text-primary">
              {language === 'ua' ? 'Інвестиційний калькулятор' : 
               language === 'pl' ? 'Kalkulator inwestycyjny' : 
               'Investment Calculator'}
            </h1>
            <p className="text-text-secondary">
              {language === 'ua' ? 'Розрахунок накопичень і пасивного доходу до пенсійного віку' : 
               language === 'pl' ? 'Obliczenie oszczędności i pasywnego dochodu do wieku emerytalnego' : 
               'Calculate savings and passive income by retirement age'}
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              {language === 'ua' ? 'Назад до калькулятора іпотеки' : 
               language === 'pl' ? 'Powrót do kalkulatora hipotecznego' : 
               'Back to Mortgage Calculator'}
            </Button>
          </Link>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input parameters */}
          <div className="lg:col-span-4">
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  {language === 'ua' ? 'Параметри інвестицій' : 
                   language === 'pl' ? 'Parametry inwestycji' : 
                   'Investment Parameters'}
                </h2>
                
                {/* Age at start */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Вік початку інвестицій' : 
                     language === 'pl' ? 'Wiek rozpoczęcia inwestycji' : 
                     'Starting Age'}
                  </label>
                  <div className="flex gap-4">
                    <Input 
                      type="number" 
                      min={18} 
                      max={64} 
                      value={startAge}
                      onChange={(e) => setStartAge(Number(e.target.value))} 
                      className="w-24"
                    />
                    <Slider
                      value={[startAge]}
                      min={18}
                      max={64}
                      step={1}
                      className="flex-1"
                      onValueChange={(value) => setStartAge(value[0])}
                    />
                  </div>
                </div>
                
                {/* Initial capital */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Початковий капітал' : 
                     language === 'pl' ? 'Kapitał początkowy' : 
                     'Initial Capital'}
                  </label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))} 
                  />
                </div>
                
                {/* Monthly investment */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Щомісячні інвестиції' : 
                     language === 'pl' ? 'Miesięczna inwestycja' : 
                     'Monthly Investment'}
                  </label>
                  <Input 
                    type="number" 
                    min={0} 
                    value={monthlyInvestment}
                    onChange={(e) => setMonthlyInvestment(Number(e.target.value))} 
                  />
                </div>
                
                {/* Annual return */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Річна дохідність (%)' : 
                     language === 'pl' ? 'Roczna stopa zwrotu (%)' : 
                     'Annual Return (%)'}
                  </label>
                  <div className="flex gap-4">
                    <Input 
                      type="number" 
                      min={0} 
                      max={30} 
                      step={0.1}
                      value={annualReturn}
                      onChange={(e) => setAnnualReturn(Number(e.target.value))} 
                      className="w-24"
                    />
                    <Slider
                      value={[annualReturn]}
                      min={0}
                      max={30}
                      step={0.5}
                      className="flex-1"
                      onValueChange={(value) => setAnnualReturn(value[0])}
                    />
                  </div>
                </div>
                
                {/* Inflation rate */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Річна інфляція (%)' : 
                     language === 'pl' ? 'Roczna inflacja (%)' : 
                     'Annual Inflation (%)'}
                  </label>
                  <div className="flex gap-4">
                    <Input 
                      type="number" 
                      min={0} 
                      max={20} 
                      step={0.1}
                      value={inflation}
                      onChange={(e) => setInflation(Number(e.target.value))} 
                      className="w-24"
                    />
                    <Slider
                      value={[inflation]}
                      min={0}
                      max={20}
                      step={0.5}
                      className="flex-1"
                      onValueChange={(value) => setInflation(value[0])}
                    />
                  </div>
                </div>
                
                {/* Consider inflation checkbox */}
                <div className="mb-4 flex items-center space-x-2">
                  <Checkbox 
                    id="inflation-checkbox" 
                    checked={considerInflation}
                    onCheckedChange={(checked) => setConsiderInflation(checked === true)}
                  />
                  <label 
                    htmlFor="inflation-checkbox" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {language === 'ua' ? 'Враховувати інфляцію' : 
                     language === 'pl' ? 'Uwzględnij inflację' : 
                     'Consider Inflation'}
                  </label>
                </div>
                
                {/* End age */}
                <div className="mb-4">
                  <label className="block text-sm mb-1">
                    {language === 'ua' ? 'Вік закінчення накопичень' : 
                     language === 'pl' ? 'Wiek zakończenia oszczędzania' : 
                     'End Age'}
                  </label>
                  <div className="flex gap-4">
                    <Input 
                      type="number" 
                      min={startAge + 1} 
                      max={65} 
                      value={endAge}
                      onChange={(e) => setEndAge(Number(e.target.value))} 
                      className="w-24"
                    />
                    <Slider
                      value={[endAge]}
                      min={startAge + 1}
                      max={65}
                      step={1}
                      className="flex-1"
                      onValueChange={(value) => setEndAge(value[0])}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Summary card */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  {language === 'ua' ? 'Підсумок' : 
                   language === 'pl' ? 'Podsumowanie' : 
                   'Summary'}
                </h2>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-text-secondary">
                      {language === 'ua' ? 'Загальний період інвестування' : 
                       language === 'pl' ? 'Okres inwestycji' : 
                       'Investment Period'}
                    </div>
                    <div className="text-sm font-medium text-right">
                      {endAge - startAge} {language === 'ua' ? 'років' : 
                                           language === 'pl' ? 'lat' : 
                                           'years'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-text-secondary">
                      {language === 'ua' ? 'Загальна сума інвестицій' : 
                       language === 'pl' ? 'Suma inwestycji' : 
                       'Total Investment'}
                    </div>
                    <div className="text-sm font-medium text-right">
                      {formatNumber(yearlyData.reduce((sum, year) => sum + year.yearlyInvestment, initialCapital))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-text-secondary">
                      {language === 'ua' ? 'Капітал на кінець періоду' : 
                       language === 'pl' ? 'Kapitał na koniec okresu' : 
                       'Final Capital'}
                    </div>
                    <div className="text-lg font-medium text-right text-primary">
                      {yearlyData.length > 0 ? formatNumber(yearlyData[yearlyData.length - 1].startingCapital + 
                                                          yearlyData[yearlyData.length - 1].yearlyInvestment + 
                                                          yearlyData[yearlyData.length - 1].capitalGrowth) : 0}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-sm text-text-secondary">
                      {language === 'ua' ? 'Щомісячний пасивний дохід' : 
                       language === 'pl' ? 'Miesięczny dochód pasywny' : 
                       'Monthly Passive Income'}
                    </div>
                    <div className="text-base font-medium text-right text-secondary">
                      {yearlyData.length > 0 ? formatNumber(yearlyData[yearlyData.length - 1].monthlyIncome) : 0}
                    </div>
                  </div>
                  
                  {considerInflation && (
                    <>
                      <div className="grid grid-cols-2 gap-2 border-t pt-2">
                        <div className="text-sm text-text-secondary">
                          {language === 'ua' ? 'Капітал з урахуванням інфляції' : 
                           language === 'pl' ? 'Kapitał z uwzględnieniem inflacji' : 
                           'Inflation-adjusted Capital'}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {yearlyData.length > 0 ? formatNumber(yearlyData[yearlyData.length - 1].inflationAdjustedCapital) : 0}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-sm text-text-secondary">
                          {language === 'ua' ? 'Дохід з урахуванням інфляції' : 
                           language === 'pl' ? 'Dochód z uwzględnieniem inflacji' : 
                           'Inflation-adjusted Income'}
                        </div>
                        <div className="text-sm font-medium text-right">
                          {yearlyData.length > 0 ? formatNumber(yearlyData[yearlyData.length - 1].inflationAdjustedIncome) : 0}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results panel */}
          <div className="lg:col-span-8">
            {/* Chart */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  {language === 'ua' ? 'Зростання капіталу' : 
                   language === 'pl' ? 'Wzrost kapitału' : 
                   'Capital Growth'}
                </h2>
                
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="age" label={{ value: language === 'ua' ? 'Вік' : 
                                                            language === 'pl' ? 'Wiek' : 
                                                            'Age', 
                                                  position: 'insideBottomRight', 
                                                  offset: -5 }} />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value) => [`${formatNumber(Number(value))}`, '']}
                        labelFormatter={(label) => `${language === 'ua' ? 'Вік' : 
                                                      language === 'pl' ? 'Wiek' : 
                                                      'Age'}: ${label}`}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="capital" 
                        name={language === 'ua' ? 'Капітал' : 
                              language === 'pl' ? 'Kapitał' : 
                              'Capital'} 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      {considerInflation && (
                        <Line 
                          type="monotone" 
                          dataKey="realCapital" 
                          name={language === 'ua' ? 'Капітал з урахуванням інфляції' : 
                                language === 'pl' ? 'Kapitał z uwzględnieniem inflacji' : 
                                'Inflation-adjusted Capital'} 
                          stroke="#82ca9d" 
                          strokeWidth={2}
                        />
                      )}
                      {chartData.map((entry, index) => {
                        if (entry.isProjection && index > 0 && !chartData[index - 1].isProjection) {
                          return (
                            <Line 
                              key={`projection-start-${index}`}
                              type="monotone" 
                              data={[chartData[index - 1], entry]} 
                              dataKey="capital"
                              name={language === 'ua' ? 'Початок прогнозу' : 
                                    language === 'pl' ? 'Początek prognozy' : 
                                    'Projection Start'} 
                              stroke="#FF5733" 
                              strokeWidth={1}
                              strokeDasharray="5 5"
                            />
                          );
                        }
                        return null;
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-2 text-xs text-text-tertiary">
                  <p>
                    {language === 'ua' ? 
                      'Примітка: Пунктирна лінія після віку завершення показує прогнозоване зростання капіталу без нових інвестицій.' : 
                     language === 'pl' ? 
                      'Uwaga: Linia przerywana po wieku zakończenia pokazuje przewidywany wzrost kapitału bez nowych inwestycji.' : 
                      'Note: Dashed line after end age shows projected capital growth without new investments.'}
                  </p>
                </div>
              </CardContent>
            </Card>
            
            {/* Yearly data table */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  {language === 'ua' ? 'Дані за роками' : 
                   language === 'pl' ? 'Dane roczne' : 
                   'Yearly Data'}
                </h2>
                
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="px-4 py-2 text-left font-medium text-sm">
                          {language === 'ua' ? 'Вік' : 
                           language === 'pl' ? 'Wiek' : 
                           'Age'}
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-sm">
                          {language === 'ua' ? 'Початковий капітал' : 
                           language === 'pl' ? 'Kapitał początkowy' : 
                           'Starting Capital'}
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-sm">
                          {language === 'ua' ? 'Інвестиції за рік' : 
                           language === 'pl' ? 'Inwestycje za rok' : 
                           'Yearly Investment'}
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-sm">
                          {language === 'ua' ? 'Приріст капіталу' : 
                           language === 'pl' ? 'Wzrost kapitału' : 
                           'Capital Growth'}
                        </th>
                        <th className="px-4 py-2 text-right font-medium text-sm">
                          {language === 'ua' ? 'Щомісячний дохід' : 
                           language === 'pl' ? 'Dochód miesięczny' : 
                           'Monthly Income'}
                        </th>
                        {considerInflation && (
                          <>
                            <th className="px-4 py-2 text-right font-medium text-sm">
                              {language === 'ua' ? 'Капітал (інфл.)' : 
                               language === 'pl' ? 'Kapitał (infl.)' : 
                               'Capital (infl.)'}
                            </th>
                            <th className="px-4 py-2 text-right font-medium text-sm">
                              {language === 'ua' ? 'Дохід (інфл.)' : 
                               language === 'pl' ? 'Dochód (infl.)' : 
                               'Income (infl.)'}
                            </th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {yearlyData.map((year, index) => (
                        <tr key={index} className={cn("border-b", index % 2 === 0 ? "bg-white" : "bg-muted/20")}>
                          <td className="px-4 py-2 text-left">{year.age}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(year.startingCapital)}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(year.yearlyInvestment)}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(year.capitalGrowth)}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(year.monthlyIncome)}</td>
                          {considerInflation && (
                            <>
                              <td className="px-4 py-2 text-right">{formatNumber(year.inflationAdjustedCapital)}</td>
                              <td className="px-4 py-2 text-right">{formatNumber(year.inflationAdjustedIncome)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-4 text-xs text-text-tertiary">
                  <p>
                    {language === 'ua' ? 
                      'Всі розрахунки виконуються на основі річного нарахування складних відсотків. Податки та комісії не враховуються.' : 
                     language === 'pl' ? 
                      'Wszystkie obliczenia wykonane na podstawie rocznego naliczania odsetek składanych. Podatki i prowizje nie są uwzględniane.' : 
                      'All calculations are based on annual compound interest. Taxes and fees are not taken into account.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <footer className="text-center text-text-tertiary text-sm mt-6">
          <p>© {new Date().getFullYear()} {t.footerText}</p>
        </footer>
      </div>
    </div>
  );
}