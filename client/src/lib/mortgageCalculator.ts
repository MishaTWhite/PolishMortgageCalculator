/**
 * Calculate monthly payment amount based on loan amount, interest rate, and loan duration
 * Using the standard Polish mortgage formula (PMT)
 */
export function calculateMonthlyPayment(
  loanAmount: number, 
  annualInterestRate: number, 
  loanDurationYears: number
): number {
  // Check for edge cases
  if (loanAmount <= 0 || loanDurationYears <= 0) {
    return 0;
  }
  
  const monthlyInterestRate = annualInterestRate / 100 / 12; // Convert annual percentage to monthly decimal
  const numberOfPayments = loanDurationYears * 12;
  
  // Handle special case of 0% interest
  if (annualInterestRate === 0) {
    return loanAmount / numberOfPayments;
  }
  
  // PMT formula: P × (r / 12) × (1 + r / 12)^n / ((1 + r / 12)^n - 1)
  const payment = loanAmount * 
    (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
    (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
  
  return Math.round(payment * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate loan duration in years based on loan amount, interest rate, and monthly payment
 */
export function calculateLoanDuration(
  loanAmount: number, 
  annualInterestRate: number, 
  monthlyPayment: number
): number {
  // Check for edge cases
  if (loanAmount <= 0 || monthlyPayment <= 0) {
    return 0;
  }
  
  const monthlyInterestRate = annualInterestRate / 100 / 12; // Convert annual percentage to monthly decimal
  
  // Handle special case of 0% interest
  if (annualInterestRate === 0) {
    return Math.ceil(loanAmount / monthlyPayment / 12);
  }
  
  // If monthly payment is too low to cover interest
  if (monthlyPayment <= loanAmount * monthlyInterestRate) {
    return 35; // Maximum duration
  }
  
  // Solve for n in PMT formula: n = log(PMT / (PMT - P*r)) / log(1+r)
  // where P is principal, r is monthly interest rate, PMT is payment amount
  const x = monthlyPayment / (monthlyPayment - (loanAmount * monthlyInterestRate));
  const n = Math.log(x) / Math.log(1 + monthlyInterestRate);
  const durationYears = Math.ceil(n / 12);
  
  // Constrain to allowed range (5-35 years)
  return Math.max(5, Math.min(35, durationYears));
}

/**
 * Format a number to Polish currency format
 */
export function formatCurrency(number: number): string {
  return new Intl.NumberFormat('pl-PL', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  }).format(number);
}

/**
 * Calculate total interest paid over the life of the loan
 */
export function calculateTotalInterest(
  loanAmount: number, 
  monthlyPayment: number, 
  loanDurationYears: number
): number {
  const totalPayments = monthlyPayment * loanDurationYears * 12;
  return totalPayments - loanAmount;
}

/**
 * Calculate principal and interest percentages for visualization
 */
export function calculateLoanPercentages(loanAmount: number, totalInterest: number): {
  principalPercent: number;
  interestPercent: number;
} {
  if (loanAmount <= 0 || totalInterest <= 0) {
    return { principalPercent: 50, interestPercent: 50 }; // Default 50/50 if invalid values
  }
  
  const totalRepayment = loanAmount + totalInterest;
  const principalPercent = Math.round((loanAmount / totalRepayment) * 100);
  const interestPercent = 100 - principalPercent;
  
  return { principalPercent, interestPercent };
}
