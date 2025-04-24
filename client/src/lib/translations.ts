import { Language } from "@/context/LanguageContext";

type TranslationKeys = {
  // Navigation
  mortgageCalculator: string;
  
  // Application title and header  
  appTitle: string;
  appDescription: string;
  
  // Calculator parameters section
  parametersTitle: string;
  propertyPrice: string;
  downPayment: string;
  loanDuration: string;
  monthlyPayment: string;
  years: string;
  
  // Interest rate section
  interestRateTitle: string;
  baseRate: string;
  baseRateAutoUpdate: string;
  bankMargin: string;
  totalInterestRate: string;
  lastUpdate: string;
  
  // Results panel
  resultsTitle: string;
  loanSummary: string;
  loanAmount: string;
  duration: string;
  payments: string;
  interestRate: string;
  totalCost: string;
  totalInterest: string;
  totalRepayment: string;
  loanStructure: string;
  principal: string;
  interest: string;
  disclaimer: string;
  
  // Info section
  howItWorksTitle: string;
  inputDataTitle: string;
  enterPropertyPrice: string;
  setDownPayment: string;
  chooseLoanPeriod: string;
  baseRateInfo: string;
  adjustBankMargin: string;
  formulaTitle: string;
  formulaDescription: string;
  formulaWhere: string;
  formulaMonthlyPayment: string;
  formulaLoanAmount: string;
  formulaAnnualRate: string;
  formulaPaymentsNumber: string;
  
  // Footer
  footerText: string;
  currentDate: string;
  
  // Language selector
  language: string;
  
  // Currency converter
  currencyConverter: string;
  currencyConverterDescription: string;
  amount: string;
  refreshRates: string;
  exchangeRatesFrom: string;
  lastUpdated: string;
  exchangeRateTable: string;
  loading: string;
  failedToLoad: string;
  
  // Accelerated repayment
  acceleratedRepayment: string;
  acceleratedRepaymentDescription: string;
  durationOfAcceleratedRepayment: string;
  month: string;
  months: string;
  year: string;
  repaymentYears: string;
  andText: string;
  paymentMultiplier: string;
  resultsLabel: string;
  loanTermReduction: string;
  newMonthlyPayment: string;
  save: string;
  perMonth: string;
  acceleratedPaymentDescription1: string;
  acceleratedPaymentDescription2: string;
  paymentMultiplierWithAmount: string;
  
  // Investment calculator
  investmentCalculator: string;
  investmentCalculatorDescription: string;
  investmentParameters: string;
  startingAge: string;
  initialCapital: string;
  monthlyInvestment: string;
  annualReturn: string;
  inflation: string;
  considerInflation: string;
  endAge: string;
  summary: string;
  investmentPeriod: string;
  totalInvestment: string;
  finalCapital: string;
  monthlyPassiveIncome: string;
  inflationAdjustedCapital: string;
  inflationAdjustedIncome: string;
  capitalGrowth: string;
  yearlyData: string;
  age: string;
  startingCapital: string;
  yearlyInvestment: string;
  capitalGrowthAmount: string;
  inflationAdjusted: string;
  projectionNote: string;
  calculationNote: string;
};

type Translations = {
  [key in Language]: TranslationKeys;
};

export const translations: Translations = {
  pl: {
    // Navigation
    mortgageCalculator: "Kalkulator Hipoteczny",
    
    // Application title and header
    appTitle: "Polski Kalkulator Kredytu Hipotecznego",
    appDescription: "Oblicz swoje miesięczne raty i całkowity koszt kredytu",
    
    // Calculator parameters section
    parametersTitle: "Parametry kredytu",
    propertyPrice: "Cena nieruchomości",
    downPayment: "Wkład własny",
    loanDuration: "Okres kredytowania",
    monthlyPayment: "Miesięczna rata",
    years: "lat",
    
    // Interest rate section
    interestRateTitle: "Oprocentowanie",
    baseRate: "Stopa bazowa NBP",
    baseRateAutoUpdate: "(aktualizowana automatycznie)",
    bankMargin: "Marża banku",
    totalInterestRate: "Łączne oprocentowanie:",
    lastUpdate: "Ostatnia aktualizacja:",
    
    // Results panel
    resultsTitle: "Wynik kalkulacji",
    loanSummary: "Podsumowanie kredytu",
    loanAmount: "Kwota kredytu:",
    duration: "Okres kredytowania:",
    payments: "rat",
    interestRate: "Oprocentowanie:",
    totalCost: "Całkowity koszt kredytu",
    totalInterest: "Suma odsetek:",
    totalRepayment: "Całkowita kwota do spłaty:",
    loanStructure: "Struktura kredytu",
    principal: "kapitał",
    interest: "odsetki",
    disclaimer: "Kalkulacja ma charakter orientacyjny i może różnić się od oferty banku. Rzeczywista rata i oprocentowanie zależą od indywidualnej oceny zdolności kredytowej.",
    
    // Info section
    howItWorksTitle: "Jak działa kalkulator?",
    inputDataTitle: "Dane wejściowe",
    enterPropertyPrice: "Wprowadź cenę nieruchomości",
    setDownPayment: "Ustaw wysokość wkładu własnego (minimum 10%)",
    chooseLoanPeriod: "Wybierz okres kredytowania lub wysokość raty miesięcznej",
    baseRateInfo: "Stopa bazowa NBP pobierana jest automatycznie",
    adjustBankMargin: "Marżę banku możesz dostosować wg aktualnych ofert",
    formulaTitle: "Formuła obliczeniowa",
    formulaDescription: "Kalkulator wykorzystuje standardowy model obliczeniowy stosowany przez polskie banki:",
    formulaWhere: "gdzie:",
    formulaMonthlyPayment: "R - rata miesięczna",
    formulaLoanAmount: "K - kwota kredytu",
    formulaAnnualRate: "r - oprocentowanie roczne",
    formulaPaymentsNumber: "n - liczba rat (okres kredytowania w miesiącach)",
    
    // Footer
    footerText: "Polski Kalkulator Kredytu Hipotecznego | Dane aktualne na dzień:",
    currentDate: "",
    
    // Language selector
    language: "Język",
    
    // Currency converter
    currencyConverter: "Przelicznik walut",
    currencyConverterDescription: "Przelicz wartości między różnymi walutami",
    amount: "Kwota",
    refreshRates: "Odśwież kursy",
    exchangeRatesFrom: "Kursy walut z",
    lastUpdated: "ostatnia aktualizacja",
    exchangeRateTable: "Tabela kursów wymiany",
    loading: "Ładowanie kursów walut...",
    failedToLoad: "Nie udało się załadować kursów walut",
    
    // Accelerated repayment
    acceleratedRepayment: "Przyspieszona spłata",
    acceleratedRepaymentDescription: "Zobacz, jak dokonywanie dodatkowych wpłat przez określony czas może zmniejszyć okres kredytowania lub przyszłe raty miesięczne.",
    durationOfAcceleratedRepayment: "Czas przyspieszonej spłaty",
    month: "miesiąc",
    months: "miesięcy",
    year: "rok",
    repaymentYears: "lat",
    andText: "i",
    paymentMultiplier: "Mnożnik wpłaty",
    resultsLabel: "Wyniki",
    loanTermReduction: "Skrócenie okresu kredytowania",
    newMonthlyPayment: "Nowa rata miesięczna",
    save: "Oszczędzasz",
    perMonth: "miesięcznie",
    acceleratedPaymentDescription1: "Jeśli dokonasz",
    acceleratedPaymentDescription2: "płatności przez",
    paymentMultiplierWithAmount: "x płatności",
    
    // Investment calculator
    investmentCalculator: "Kalkulator Inwestycyjny",
    investmentCalculatorDescription: "Obliczenie oszczędności i pasywnego dochodu do wieku emerytalnego",
    investmentParameters: "Parametry inwestycji",
    startingAge: "Wiek rozpoczęcia inwestycji",
    initialCapital: "Kapitał początkowy",
    monthlyInvestment: "Miesięczna inwestycja",
    annualReturn: "Roczna stopa zwrotu (%)",
    inflation: "Roczna inflacja (%)",
    considerInflation: "Uwzględnij inflację",
    endAge: "Wiek końcowy tworzenia kapitału",
    summary: "Podsumowanie",
    investmentPeriod: "Okres inwestycji",
    totalInvestment: "Suma inwestycji",
    finalCapital: "Kapitał na koniec okresu",
    monthlyPassiveIncome: "Miesięczny dochód pasywny",
    inflationAdjustedCapital: "Kapitał z uwzględnieniem inflacji",
    inflationAdjustedIncome: "Dochód z uwzględnieniem inflacji",
    capitalGrowth: "Wzrost kapitału",
    yearlyData: "Dane roczne",
    age: "Wiek",
    startingCapital: "Kapitał początkowy",
    yearlyInvestment: "Inwestycje za rok",
    capitalGrowthAmount: "Wzrost kapitału",
    inflationAdjusted: "z uwzględnieniem inflacji",
    projectionNote: "Uwaga: Linia przerywana po wieku zakończenia pokazuje przewidywany wzrost kapitału bez nowych inwestycji.",
    calculationNote: "Wszystkie obliczenia wykonane na podstawie rocznego naliczania odsetek składanych. Podatki i prowizje nie są uwzględniane."
  },
  
  en: {
    // Navigation
    mortgageCalculator: "Mortgage Calculator",
    
    // Application title and header
    appTitle: "Polish Mortgage Calculator",
    appDescription: "Calculate your monthly payments and total loan cost",
    
    // Calculator parameters section
    parametersTitle: "Loan Parameters",
    propertyPrice: "Property Price",
    downPayment: "Down Payment",
    loanDuration: "Loan Duration",
    monthlyPayment: "Monthly Payment",
    years: "years",
    
    // Interest rate section
    interestRateTitle: "Interest Rate",
    baseRate: "NBP Base Rate",
    baseRateAutoUpdate: "(automatically updated)",
    bankMargin: "Bank Margin",
    totalInterestRate: "Total Interest Rate:",
    lastUpdate: "Last update:",
    
    // Results panel
    resultsTitle: "Calculation Results",
    loanSummary: "Loan Summary",
    loanAmount: "Loan Amount:",
    duration: "Loan Duration:",
    payments: "payments",
    interestRate: "Interest Rate:",
    totalCost: "Total Loan Cost",
    totalInterest: "Total Interest:",
    totalRepayment: "Total Repayment Amount:",
    loanStructure: "Loan Structure",
    principal: "principal",
    interest: "interest",
    disclaimer: "This calculation is for informational purposes only and may differ from bank offers. The actual payment and interest rate depend on individual creditworthiness assessment.",
    
    // Info section
    howItWorksTitle: "How does the calculator work?",
    inputDataTitle: "Input Data",
    enterPropertyPrice: "Enter property price",
    setDownPayment: "Set down payment amount (minimum 10%)",
    chooseLoanPeriod: "Choose loan duration or monthly payment amount",
    baseRateInfo: "NBP base rate is fetched automatically",
    adjustBankMargin: "Bank margin can be adjusted according to current offers",
    formulaTitle: "Calculation Formula",
    formulaDescription: "The calculator uses the standard calculation model used by Polish banks:",
    formulaWhere: "where:",
    formulaMonthlyPayment: "R - monthly payment",
    formulaLoanAmount: "K - loan amount",
    formulaAnnualRate: "r - annual interest rate",
    formulaPaymentsNumber: "n - number of payments (loan term in months)",
    
    // Footer
    footerText: "Polish Mortgage Calculator | Data current as of:",
    currentDate: "",
    
    // Language selector
    language: "Language",
    
    // Currency converter
    currencyConverter: "Currency Converter",
    currencyConverterDescription: "Convert values between different currencies",
    amount: "Amount",
    refreshRates: "Refresh Rates",
    exchangeRatesFrom: "Exchange rates from",
    lastUpdated: "last updated",
    exchangeRateTable: "Exchange Rate Table",
    loading: "Loading exchange rates...",
    failedToLoad: "Failed to load exchange rates",
    
    // Accelerated repayment
    acceleratedRepayment: "Accelerated Repayment",
    acceleratedRepaymentDescription: "See how making extra payments for a specific period can reduce your loan term or future monthly payments.",
    durationOfAcceleratedRepayment: "Duration of accelerated repayment",
    month: "month",
    months: "months",
    year: "year",
    repaymentYears: "years",
    andText: "and",
    paymentMultiplier: "Payment multiplier",
    resultsLabel: "Results",
    loanTermReduction: "Loan term reduction",
    newMonthlyPayment: "New monthly payment",
    save: "You save",
    perMonth: "per month",
    acceleratedPaymentDescription1: "If you make",
    acceleratedPaymentDescription2: "payments for",
    paymentMultiplierWithAmount: "x payment",
    
    // Investment calculator
    investmentCalculator: "Investment Calculator",
    investmentCalculatorDescription: "Calculate savings and passive income by retirement age",
    investmentParameters: "Investment Parameters",
    startingAge: "Starting Age",
    initialCapital: "Initial Capital",
    monthlyInvestment: "Monthly Investment",
    annualReturn: "Annual Return (%)",
    inflation: "Annual Inflation (%)",
    considerInflation: "Consider Inflation",
    endAge: "End Capital Formation Age",
    summary: "Summary",
    investmentPeriod: "Investment Period",
    totalInvestment: "Total Investment",
    finalCapital: "Final Capital",
    monthlyPassiveIncome: "Monthly Passive Income",
    inflationAdjustedCapital: "Inflation-adjusted Capital",
    inflationAdjustedIncome: "Inflation-adjusted Income",
    capitalGrowth: "Capital Growth",
    yearlyData: "Yearly Data",
    age: "Age",
    startingCapital: "Starting Capital",
    yearlyInvestment: "Yearly Investment",
    capitalGrowthAmount: "Capital Growth",
    inflationAdjusted: "inflation adjusted",
    projectionNote: "Note: Dashed line after end age shows projected capital growth without new investments.",
    calculationNote: "All calculations are based on annual compound interest. Taxes and fees are not taken into account."
  },
  
  ua: {
    // Navigation
    mortgageCalculator: "Іпотечний калькулятор",
    
    // Application title and header
    appTitle: "Польський калькулятор іпотеки",
    appDescription: "Розрахуйте свої щомісячні платежі та загальну вартість кредиту",
    
    // Calculator parameters section
    parametersTitle: "Параметри кредиту",
    propertyPrice: "Ціна нерухомості",
    downPayment: "Перший внесок",
    loanDuration: "Термін кредиту",
    monthlyPayment: "Щомісячний платіж",
    years: "років",
    
    // Interest rate section
    interestRateTitle: "Процентна ставка",
    baseRate: "Базова ставка НБП",
    baseRateAutoUpdate: "(оновлюється автоматично)",
    bankMargin: "Маржа банку",
    totalInterestRate: "Загальна процентна ставка:",
    lastUpdate: "Останнє оновлення:",
    
    // Results panel
    resultsTitle: "Результати розрахунку",
    loanSummary: "Загальна інформація",
    loanAmount: "Сума кредиту:",
    duration: "Термін кредиту:",
    payments: "платежів",
    interestRate: "Процентна ставка:",
    totalCost: "Загальна вартість кредиту",
    totalInterest: "Сума відсотків:",
    totalRepayment: "Загальна сума до сплати:",
    loanStructure: "Структура кредиту",
    principal: "основна сума",
    interest: "відсотки",
    disclaimer: "Цей розрахунок має орієнтовний характер і може відрізнятися від пропозиції банку. Фактичний платіж та процентна ставка залежать від індивідуальної оцінки кредитоспроможності.",
    
    // Info section
    howItWorksTitle: "Як працює калькулятор?",
    inputDataTitle: "Вхідні дані",
    enterPropertyPrice: "Введіть ціну нерухомості",
    setDownPayment: "Встановіть розмір першого внеску (мінімум 10%)",
    chooseLoanPeriod: "Виберіть термін кредиту або розмір щомісячного платежу",
    baseRateInfo: "Базова ставка НБП завантажується автоматично",
    adjustBankMargin: "Маржу банку можна налаштувати відповідно до поточних пропозицій",
    formulaTitle: "Формула розрахунку",
    formulaDescription: "Калькулятор використовує стандартну модель розрахунку, яка застосовується польськими банками:",
    formulaWhere: "де:",
    formulaMonthlyPayment: "R - щомісячний платіж",
    formulaLoanAmount: "K - сума кредиту",
    formulaAnnualRate: "r - річна процентна ставка",
    formulaPaymentsNumber: "n - кількість платежів (термін кредиту в місяцях)",
    
    // Footer
    footerText: "Польський калькулятор іпотеки | Дані актуальні на:",
    currentDate: "",
    
    // Language selector
    language: "Мова",
    
    // Currency converter
    currencyConverter: "Конвертер валют",
    currencyConverterDescription: "Конвертуйте значення між різними валютами",
    amount: "Сума",
    refreshRates: "Оновити курси",
    exchangeRatesFrom: "Курси валют з",
    lastUpdated: "останнє оновлення",
    exchangeRateTable: "Таблиця курсів валют",
    loading: "Завантаження курсів валют...",
    failedToLoad: "Не вдалося завантажити курси валют",
    
    // Accelerated repayment
    acceleratedRepayment: "Прискорене погашення",
    acceleratedRepaymentDescription: "Подивіться, як додаткові платежі протягом певного періоду можуть скоротити термін кредиту або зменшити майбутні щомісячні платежі.",
    durationOfAcceleratedRepayment: "Тривалість прискореного погашення",
    month: "місяць",
    months: "місяці",
    year: "рік",
    repaymentYears: "років",
    andText: "і",
    paymentMultiplier: "Множник платежу",
    resultsLabel: "Результати",
    loanTermReduction: "Скорочення терміну кредиту",
    newMonthlyPayment: "Новий щомісячний платіж",
    save: "Ви заощаджуєте",
    perMonth: "на місяць",
    acceleratedPaymentDescription1: "Якщо ви здійсните",
    acceleratedPaymentDescription2: "платежів протягом",
    paymentMultiplierWithAmount: "x платіж",
    
    // Investment calculator
    investmentCalculator: "Інвестиційний калькулятор",
    investmentCalculatorDescription: "Розрахунок заощаджень та пасивного доходу до пенсійного віку",
    investmentParameters: "Параметри інвестування",
    startingAge: "Початковий вік",
    initialCapital: "Початковий капітал",
    monthlyInvestment: "Щомісячні інвестиції",
    annualReturn: "Річна прибутковість (%)",
    inflation: "Річна інфляція (%)",
    considerInflation: "Враховувати інфляцію",
    endAge: "Кінцевий вік формування капіталу",
    summary: "Підсумок",
    investmentPeriod: "Період інвестування",
    totalInvestment: "Загальні інвестиції",
    finalCapital: "Кінцевий капітал",
    monthlyPassiveIncome: "Щомісячний пасивний дохід",
    inflationAdjustedCapital: "Капітал з урахуванням інфляції",
    inflationAdjustedIncome: "Дохід з урахуванням інфляції",
    capitalGrowth: "Зростання капіталу",
    yearlyData: "Щорічні дані",
    age: "Вік",
    startingCapital: "Початковий капітал",
    yearlyInvestment: "Річні інвестиції",
    capitalGrowthAmount: "Приріст капіталу",
    inflationAdjusted: "з урахуванням інфляції",
    projectionNote: "Примітка: Пунктирна лінія після кінцевого віку показує прогнозоване зростання капіталу без нових інвестицій.",
    calculationNote: "Всі розрахунки базуються на річному складному відсотку. Податки та комісії не враховуються."
  }
};

export function useTranslations(language: Language) {
  return translations[language];
}