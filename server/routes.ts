import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import { format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current NBP interest rate
  app.get("/api/interest-rate", async (req, res) => {
    try {
      // First check if we have a recently cached rate (less than 24 hours old)
      const cachedRate = await fetchCachedRate();
      
      if (cachedRate) {
        return res.json(cachedRate);
      }
      
      // Otherwise fetch a new rate
      const rate = await fetchNBPRate();
      
      // Format the date to Polish format (DD.MM.YYYY)
      const currentDate = format(new Date(), "dd.MM.yyyy");
      
      // Store the new rate
      await storage.createInterestRate({
        source: "NBP",
        rate: rate.toString(),
        fetchDate: currentDate
      });
      
      res.json({
        source: "NBP",
        rate: rate,
        fetchDate: currentDate
      });
    } catch (error) {
      console.error("Error fetching interest rate:", error);
      // If we can't fetch live data, return a fallback value
      res.json({
        source: "NBP (fallback)",
        rate: 5.75,
        fetchDate: format(new Date(), "dd.MM.yyyy")
      });
    }
  });

  // Calculate mortgage details based on provided parameters
  app.post("/api/calculate-mortgage", (req, res) => {
    try {
      const { 
        propertyPrice, 
        downPaymentPercent, 
        loanDuration, 
        totalInterestRate 
      } = req.body;
      
      // Input validation
      if (!propertyPrice || !downPaymentPercent || !loanDuration || !totalInterestRate) {
        return res.status(400).json({ 
          message: "Missing required parameters: propertyPrice, downPaymentPercent, loanDuration, totalInterestRate" 
        });
      }
      
      // Calculate loan amount
      const downPaymentAmount = propertyPrice * (downPaymentPercent / 100);
      const loanAmount = propertyPrice - downPaymentAmount;
      
      // Calculate monthly payment using PMT formula
      const monthlyInterestRate = totalInterestRate / 100 / 12;
      const numberOfPayments = loanDuration * 12;
      
      let monthlyPayment;
      if (totalInterestRate === 0) {
        monthlyPayment = loanAmount / numberOfPayments;
      } else {
        monthlyPayment = loanAmount * 
          (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / 
          (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);
      }
      
      // Calculate total cost
      const totalRepayment = monthlyPayment * numberOfPayments;
      const totalInterest = totalRepayment - loanAmount;
      
      res.json({
        loanAmount,
        monthlyPayment,
        loanDurationMonths: numberOfPayments,
        totalInterest,
        totalRepayment,
        interestRate: totalInterestRate
      });
    } catch (error) {
      console.error("Error calculating mortgage:", error);
      res.status(500).json({ message: "Error calculating mortgage" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to fetch interest rate from NBP
async function fetchNBPRate(): Promise<number> {
  try {
    // Due to NBP not having a simple public API for reference rates,
    // in a real application we would use a proper API or web scraping.
    // For this demonstration, we're returning a reasonable current value.
    // In production, this would be replaced with actual API integration.
    return 5.75; // Current NBP reference rate as of 2023
  } catch (error) {
    console.error("Error fetching NBP rate:", error);
    throw error;
  }
}

// Helper function to get cached rate if available
async function fetchCachedRate() {
  // Get the most recent rate from storage
  const latestRate = await storage.getLatestInterestRate();
  
  if (latestRate) {
    // Check if the rate is still fresh (less than 24 hours old)
    const fetchDate = new Date(latestRate.fetchDate.split('.').reverse().join('-'));
    const now = new Date();
    const hoursDifference = (now.getTime() - fetchDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDifference < 24) {
      return {
        source: latestRate.source,
        rate: parseFloat(latestRate.rate),
        fetchDate: latestRate.fetchDate
      };
    }
  }
  
  return null;
}
