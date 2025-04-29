import { Language } from "@/context/LanguageContext";

type TranslationKeys = {
  // Navigation
  mortgageCalculator: string;
  investmentCalculator: string;
  currencyConverter: string;
  propertyMarketAnalysis: string;
  propertyStatistics: string;
  
  // Application title and header  
  appTitle: string;
  appDescription: string;
  propertyMarketAnalysisDescription: string;
  
  // Property market analysis
  refresh: string;
  forceRefresh: string;
  updateAllCities: string;
  errorLoadingData: string;
  cityAveragePrice: string;
  dataBasedOn: string;
  activeListings: string;
  pricesByDistrict: string;
  pricesByDistrictDescription: string;
  pricesByRoomType: string;
  roomBreakdown: string;
  oneRoom: string;
  twoRoom: string;
  threeRoom: string;
  fourPlusRoom: string;
  district: string;
  avgPricePerSqm: string;
  avgArea: string;
  listings: string;
  processedListings: string;
  reportedCount: string;
  reported: string;
  priceRange: string;
  aboveAvg: string;
  belowAvg: string;
  nearAvg: string;
  dataDisclaimer: string;
  dataDisclaimerDetails: string;
  noDataAvailable: string;
  lastUpdated: string;
  updateAllData: string;
  
  // Playwright scraper
  usePlaywrightScraper: string;
  playwrightScraperStatus: string;
  taskProgress: string;
  tasksCompleted: string;
  processing: string;
  idle: string;
  error: string;
  taskDetails: string;
  refreshStatus: string;
  ratesLastUpdated: string;
  
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
  
  // Currency converter section
  currencyConverterDescription: string;
  amount: string;
  refreshRates: string;
  exchangeRatesFrom: string;
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
  
  // Investment calculator section
  investmentCalculatorDescription: string;
  investmentParameters: string;
  startingAge: string;
  initialCapital: string;
  monthlyInvestment: string;
  annualReturn: string;
  inflation: string;
  considerInflation: string;
  reinvestIncomeInProjection: string;
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
    investmentCalculator: "Kalkulator Inwestycyjny",
    currencyConverter: "Przelicznik walut",
    propertyMarketAnalysis: "Analiza Rynku Nieruchomości",
    propertyStatistics: "Statystyki Nieruchomości",
    
    // Application title and header
    appTitle: "Polski Kalkulator Kredytu Hipotecznego",
    appDescription: "Oblicz swoje miesięczne raty i całkowity koszt kredytu",
    propertyMarketAnalysisDescription: "Analiza cen nieruchomości w głównych miastach Polski",
    
    // Property market analysis
    refresh: "Odśwież dane",
    forceRefresh: "Zaktualizuj z Otodom",
    updateAllCities: "Zaktualizuj wszystkie miasta",
    updateAllData: "Aktualizuj dane nieruchomości",
    errorLoadingData: "Nie udało się załadować danych",
    cityAveragePrice: "Średnia cena za m² w mieście",
    dataBasedOn: "Dane oparte na",
    activeListings: "aktywnych ogłoszeniach",
    pricesByDistrict: "Ceny według dzielnic",
    pricesByDistrictDescription: "Porównanie cen nieruchomości w różnych dzielnicach",
    pricesByRoomType: "Średnie ceny według liczby pokoi",
    roomBreakdown: "Podział według pokoi",
    oneRoom: "1 Pokój",
    twoRoom: "2 Pokoje",
    threeRoom: "3 Pokoje",
    fourPlusRoom: "4+ Pokoje",
    district: "Dzielnica",
    avgPricePerSqm: "Średnia cena/m²",
    avgArea: "Średnia powierzchnia",
    listings: "Ogłoszenia",
    processedListings: "przetworzonych",
    reportedCount: "podanych",
    reported: "zgl.",
    priceRange: "Zakres cen",
    aboveAvg: "Powyżej średniej",
    belowAvg: "Poniżej średniej",
    nearAvg: "Blisko średniej",
    dataDisclaimer: "Zastrzeżenie: Dane pochodzą z",
    dataDisclaimerDetails: "Ceny mogą się różnić od rzeczywistych transakcji i zależą od wielu czynników, w tym standardu wykończenia, piętra, dostępności itd.",
    noDataAvailable: "Brak dostępnych danych. Spróbuj ponownie później.",
    lastUpdated: "Ostatnia aktualizacja",
    
    // Playwright scraper
    usePlaywrightScraper: "Użyj Playwright Scraper",
    playwrightScraperStatus: "Status Playwright Scraper",
    taskProgress: "Postęp zadania",
    tasksCompleted: "zadań ukończonych",
    processing: "Przetwarzanie",
    idle: "Bezczynny",
    error: "Błąd",
    taskDetails: "Szczegóły zadania",
    refreshStatus: "Odśwież status",
    ratesLastUpdated: "ostatnia aktualizacja",
    
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
    currencyConverterDescription: "Przelicz wartości między różnymi walutami",
    amount: "Kwota",
    refreshRates: "Odśwież kursy",
    exchangeRatesFrom: "Kursy walut z",
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
    investmentCalculatorDescription: "Obliczenie oszczędności i pasywnego dochodu do wieku emerytalnego",
    investmentParameters: "Parametry inwestycji",
    startingAge: "Wiek rozpoczęcia inwestycji",
    initialCapital: "Kapitał początkowy",
    monthlyInvestment: "Miesięczna inwestycja",
    annualReturn: "Roczna stopa zwrotu (%)",
    inflation: "Roczna inflacja (%)",
    considerInflation: "Uwzględnij inflację",
    reinvestIncomeInProjection: "Reinwestuj dochód w okresie projekcji",
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
    projectionNote: "Uwaga: Linia przerywana po wieku zakończenia pokazuje przewidywany wzrost kapitału. Użyj opcji \"Reinwestuj dochód\" aby zobaczyć różnicę między ponownym inwestowaniem a wydatkowaniem dochodów pasywnych.",
    calculationNote: "Wszystkie obliczenia wykonane na podstawie rocznego naliczania odsetek składanych. Podatki i prowizje nie są uwzględniane."
  },
  
  en: {
    // Navigation
    mortgageCalculator: "Mortgage Calculator",
    investmentCalculator: "Investment Calculator",
    currencyConverter: "Currency Converter",
    propertyMarketAnalysis: "Property Market Analysis",
    propertyStatistics: "Property Statistics",
    
    // Application title and header
    appTitle: "Polish Mortgage Calculator",
    appDescription: "Calculate your monthly payments and total cost of the loan",
    propertyMarketAnalysisDescription: "Property price analysis in major Polish cities",
    
    // Property market analysis
    refresh: "Refresh Data",
    forceRefresh: "Update from Otodom",
    updateAllCities: "Update All Cities",
    updateAllData: "Update Property Data",
    errorLoadingData: "Error loading data. Please try again later.",
    cityAveragePrice: "City Average Price per m²",
    dataBasedOn: "Based on",
    activeListings: "active listings",
    pricesByDistrict: "Prices by District",
    pricesByDistrictDescription: "Comparison of property prices across different districts",
    pricesByRoomType: "Average prices by room type",
    roomBreakdown: "Room Breakdown",
    oneRoom: "1 Room",
    twoRoom: "2 Rooms",
    threeRoom: "3 Rooms",
    fourPlusRoom: "4+ Rooms",
    district: "District",
    avgPricePerSqm: "Avg Price/m²",
    avgArea: "Average Area",
    listings: "Listings",
    processedListings: "processed",
    reportedCount: "reported",
    reported: "rep.",
    priceRange: "Price Range",
    aboveAvg: "Above average",
    belowAvg: "Below average",
    nearAvg: "Near average",
    dataDisclaimer: "Disclaimer: Data sourced from",
    dataDisclaimerDetails: "Prices may differ from actual transactions and depend on many factors including finish standard, floor, accessibility, etc.",
    noDataAvailable: "No data available. Please try again later.",
    lastUpdated: "Last updated",
    
    // Playwright scraper
    usePlaywrightScraper: "Use Playwright Scraper",
    playwrightScraperStatus: "Playwright Scraper Status",
    taskProgress: "Task Progress",
    tasksCompleted: "tasks completed",
    processing: "Processing",
    idle: "Idle",
    error: "Error",
    taskDetails: "Task Details",
    refreshStatus: "Refresh Status",
    ratesLastUpdated: "last updated",
    
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
    baseRateAutoUpdate: "(auto-updated)",
    bankMargin: "Bank Margin",
    totalInterestRate: "Total Interest Rate:",
    lastUpdate: "Last update:",
    
    // Results panel
    resultsTitle: "Calculation Results",
    loanSummary: "Loan Summary",
    loanAmount: "Loan Amount:",
    duration: "Duration:",
    payments: "payments",
    interestRate: "Interest Rate:",
    totalCost: "Total Cost of Loan",
    totalInterest: "Total Interest:",
    totalRepayment: "Total Amount to Repay:",
    loanStructure: "Loan Structure",
    principal: "principal",
    interest: "interest",
    disclaimer: "This calculation is for guidance only and might differ from a bank's offer. Actual rates and payments depend on individual credit assessment.",
    
    // Info section
    howItWorksTitle: "How Does It Work?",
    inputDataTitle: "Input Data",
    enterPropertyPrice: "Enter property price",
    setDownPayment: "Set down payment amount (minimum 10%)",
    chooseLoanPeriod: "Choose loan period or monthly payment amount",
    baseRateInfo: "NBP base rate is automatically fetched",
    adjustBankMargin: "Adjust bank margin according to current offers",
    formulaTitle: "Calculation Formula",
    formulaDescription: "This calculator uses the standard calculation model used by Polish banks:",
    formulaWhere: "where:",
    formulaMonthlyPayment: "R - monthly payment",
    formulaLoanAmount: "K - loan amount",
    formulaAnnualRate: "r - annual interest rate",
    formulaPaymentsNumber: "n - number of payments (loan period in months)",
    
    // Footer
    footerText: "Polish Mortgage Calculator | Data current as of:",
    currentDate: "",
    
    // Language selector
    language: "Language",
    
    // Currency converter
    currencyConverterDescription: "Convert values between different currencies",
    amount: "Amount",
    refreshRates: "Refresh Rates",
    exchangeRatesFrom: "Exchange rates from",
    exchangeRateTable: "Exchange Rate Table",
    loading: "Loading exchange rates...",
    failedToLoad: "Failed to load exchange rates",
    
    // Accelerated repayment
    acceleratedRepayment: "Accelerated Repayment",
    acceleratedRepaymentDescription: "See how making additional payments for a certain period can reduce the loan term or future monthly payments.",
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
    investmentCalculatorDescription: "Calculate savings and passive income to retirement age",
    investmentParameters: "Investment Parameters",
    startingAge: "Starting Age",
    initialCapital: "Initial Capital",
    monthlyInvestment: "Monthly Investment",
    annualReturn: "Annual Return (%)",
    inflation: "Annual Inflation (%)",
    considerInflation: "Consider Inflation",
    reinvestIncomeInProjection: "Reinvest income in projection period",
    endAge: "End Age for Capital Formation",
    summary: "Summary",
    investmentPeriod: "Investment Period",
    totalInvestment: "Total Investment",
    finalCapital: "Final Capital",
    monthlyPassiveIncome: "Monthly Passive Income",
    inflationAdjustedCapital: "Inflation-Adjusted Capital",
    inflationAdjustedIncome: "Inflation-Adjusted Income",
    capitalGrowth: "Capital Growth",
    yearlyData: "Yearly Data",
    age: "Age",
    startingCapital: "Starting Capital",
    yearlyInvestment: "Yearly Investment",
    capitalGrowthAmount: "Capital Growth",
    inflationAdjusted: "inflation adjusted",
    projectionNote: "Note: Dotted line after end age shows projected capital growth. Use the \"Reinvest income\" option to see the difference between reinvesting and spending passive income.",
    calculationNote: "All calculations based on annual compound interest. Taxes and fees are not considered."
  },
  
  ua: {
    // Navigation
    mortgageCalculator: "Іпотечний калькулятор",
    investmentCalculator: "Інвестиційний калькулятор",
    currencyConverter: "Конвертер валют",
    propertyMarketAnalysis: "Аналіз ринку нерухомості",
    propertyStatistics: "Статистика нерухомості",
    
    // Application title and header
    appTitle: "Польський іпотечний калькулятор",
    appDescription: "Розрахуйте свої щомісячні платежі та загальну вартість кредиту",
    propertyMarketAnalysisDescription: "Аналіз цін на нерухомість у великих містах Польщі",
    
    // Property market analysis
    refresh: "Оновити дані",
    forceRefresh: "Оновити з Otodom",
    updateAllCities: "Оновити всі міста",
    updateAllData: "Оновити дані про нерухомість",
    errorLoadingData: "Помилка завантаження даних. Спробуйте пізніше.",
    cityAveragePrice: "Середня ціна за м² у місті",
    dataBasedOn: "На основі",
    activeListings: "активних оголошень",
    pricesByDistrict: "Ціни за районами",
    pricesByDistrictDescription: "Порівняння цін на нерухомість у різних районах",
    pricesByRoomType: "Середні ціни за кількістю кімнат",
    roomBreakdown: "Розподіл за кімнатами",
    oneRoom: "1 Кімната",
    twoRoom: "2 Кімнати",
    threeRoom: "3 Кімнати",
    fourPlusRoom: "4+ Кімнат",
    district: "Район",
    avgPricePerSqm: "Середня ціна/м²",
    avgArea: "Середня площа",
    listings: "Оголошення",
    processedListings: "оброблених",
    reportedCount: "вказаних",
    reported: "вказ.",
    priceRange: "Діапазон цін",
    aboveAvg: "Вище середнього",
    belowAvg: "Нижче середнього",
    nearAvg: "Близько до середнього",
    dataDisclaimer: "Застереження: Дані отримані з",
    dataDisclaimerDetails: "Ціни можуть відрізнятися від реальних транзакцій і залежать від багатьох факторів, включаючи стандарт оздоблення, поверх, доступність тощо.",
    noDataAvailable: "Дані відсутні. Спробуйте пізніше.",
    lastUpdated: "Останнє оновлення",
    
    // Playwright scraper
    usePlaywrightScraper: "Використовувати Playwright Scraper",
    playwrightScraperStatus: "Статус Playwright Scraper",
    taskProgress: "Прогрес завдання",
    tasksCompleted: "завдань завершено",
    processing: "Обробка",
    idle: "Очікування",
    error: "Помилка",
    taskDetails: "Деталі завдання",
    refreshStatus: "Оновити статус",
    ratesLastUpdated: "останнє оновлення",
    
    // Calculator parameters section
    parametersTitle: "Параметри кредиту",
    propertyPrice: "Ціна нерухомості",
    downPayment: "Перший внесок",
    loanDuration: "Тривалість кредиту",
    monthlyPayment: "Щомісячний платіж",
    years: "років",
    
    // Interest rate section
    interestRateTitle: "Процентна ставка",
    baseRate: "Базова ставка НБП",
    baseRateAutoUpdate: "(автоматично оновлюється)",
    bankMargin: "Маржа банку",
    totalInterestRate: "Загальна процентна ставка:",
    lastUpdate: "Останнє оновлення:",
    
    // Results panel
    resultsTitle: "Результати розрахунку",
    loanSummary: "Зведення по кредиту",
    loanAmount: "Сума кредиту:",
    duration: "Термін кредиту:",
    payments: "платежів",
    interestRate: "Процентна ставка:",
    totalCost: "Загальна вартість кредиту",
    totalInterest: "Загальні відсотки:",
    totalRepayment: "Загальна сума до сплати:",
    loanStructure: "Структура кредиту",
    principal: "основний борг",
    interest: "відсотки",
    disclaimer: "Цей розрахунок має орієнтовний характер і може відрізнятися від пропозиції банку. Фактичні ставки та платежі залежать від індивідуальної оцінки кредитоспроможності.",
    
    // Info section
    howItWorksTitle: "Як це працює?",
    inputDataTitle: "Вхідні дані",
    enterPropertyPrice: "Введіть ціну нерухомості",
    setDownPayment: "Встановіть суму першого внеску (мінімум 10%)",
    chooseLoanPeriod: "Виберіть термін кредиту або суму щомісячного платежу",
    baseRateInfo: "Базова ставка НБП автоматично оновлюється",
    adjustBankMargin: "Налаштуйте маржу банку відповідно до поточних пропозицій",
    formulaTitle: "Формула розрахунку",
    formulaDescription: "Цей калькулятор використовує стандартну модель розрахунку, яку використовують польські банки:",
    formulaWhere: "де:",
    formulaMonthlyPayment: "R - щомісячний платіж",
    formulaLoanAmount: "K - сума кредиту",
    formulaAnnualRate: "r - річна процентна ставка",
    formulaPaymentsNumber: "n - кількість платежів (термін кредиту в місяцях)",
    
    // Footer
    footerText: "Польський іпотечний калькулятор | Дані актуальні станом на:",
    currentDate: "",
    
    // Language selector
    language: "Мова",
    
    // Currency converter
    currencyConverterDescription: "Конвертуйте значення між різними валютами",
    amount: "Сума",
    refreshRates: "Оновити курси",
    exchangeRatesFrom: "Курси валют з",
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
    investmentCalculatorDescription: "Розрахунок заощаджень та пасивного доходу до пенсійного віку",
    investmentParameters: "Параметри інвестування",
    startingAge: "Початковий вік",
    initialCapital: "Початковий капітал",
    monthlyInvestment: "Щомісячні інвестиції",
    annualReturn: "Річна прибутковість (%)",
    inflation: "Річна інфляція (%)",
    considerInflation: "Враховувати інфляцію",
    reinvestIncomeInProjection: "Реінвестувати дохід у період проекції",
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
    projectionNote: "Примітка: Пунктирна лінія після кінцевого віку показує прогнозоване зростання капіталу. Використовуйте опцію \"Реінвестувати дохід\" щоб побачити різницю між реінвестуванням пасивного доходу і його витрачанням.",
    calculationNote: "Всі розрахунки базуються на річному складному відсотку. Податки та комісії не враховуються."
  }
};

export function useTranslations(language: Language) {
  return translations[language];
}