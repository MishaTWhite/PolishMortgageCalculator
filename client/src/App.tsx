import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MortgageCalculator from "@/pages/MortgageCalculator";
import InvestmentCalculator from "@/pages/InvestmentCalculator";
import CurrencyConverterPage from "@/pages/CurrencyConverter";
import PropertyMarketAnalysis from "@/pages/PropertyMarketAnalysis";
import { LanguageProvider } from "@/context/LanguageContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MortgageCalculator} />
      <Route path="/investment" component={InvestmentCalculator} />
      <Route path="/converter" component={CurrencyConverterPage} />
      <Route path="/property-market-analysis" component={PropertyMarketAnalysis} />
      <Route path="/property-statistics">
        {() => {
          window.location.href = "/property-market-analysis";
          return null;
        }}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
