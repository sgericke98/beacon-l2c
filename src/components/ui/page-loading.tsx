"use client";

import { Loading } from "./loading";
import { useState, useEffect } from "react";

interface PageLoadingProps {
  title?: string;
  description?: string;
  showProgress?: boolean;
  progress?: number;
}

export function PageLoading({ 
  title = "Loading...", 
  description = "Please wait while we load your data",
  showProgress = false,
  progress = 0
}: PageLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  const steps = [
    "Connecting to database...",
    "Loading data...",
    "Preparing dashboard..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 1500); // Change step every 1.5 seconds

    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center space-y-6">
          {/* Logo/Brand */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          
          {/* Loading Animation */}
          <Loading size="lg" />
          
          {/* Title */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              {title}
            </h2>
            <p className="text-gray-600">
              {description}
            </p>
          </div>
          
          {/* Progress Bar */}
          {showProgress && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
          
          {/* Loading Steps */}
          <div className="space-y-2 text-sm text-gray-500">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center justify-center gap-2">
                <div 
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentStep 
                      ? 'bg-primary animate-pulse scale-110' 
                      : index < currentStep 
                        ? 'bg-primary/60' 
                        : 'bg-gray-300'
                  }`} 
                />
                <span className={index === currentStep ? 'text-primary font-medium' : ''}>
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Specific loading states for different pages
export function DashboardLoading() {
  return (
    <PageLoading 
      title="Loading Dashboard"
      description="Preparing your analytics and metrics"
    />
  );
}

export function DataLoading() {
  return (
    <PageLoading 
      title="Loading Data"
      description="Fetching your latest records and updates"
    />
  );
}

export function FlowLoading() {
  return (
    <PageLoading 
      title="Analyzing Flow"
      description="Processing your sales pipeline data"
    />
  );
}

export function AuthLoading() {
  return (
    <PageLoading 
      title="Authenticating"
      description="Verifying your credentials and permissions"
    />
  );
}
