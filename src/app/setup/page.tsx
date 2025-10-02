"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {  Download, RefreshCw, CheckCircle, AlertCircle, Clock, DollarSign } from "lucide-react";
import { cacheInvalidation } from "@/lib/cache";
import { useAuth } from "@/contexts/AuthContext";
import SalesforceAuthButton from "@/components/SalesforceAuthButton";

interface LastUpdateInfo {
  opportunities: string | null;
  quotes: string | null;
  orders: string | null;
  invoices: string | null;
  payments: string | null;
  creditMemos: string | null;
  exchangeRates: string | null;
  productMetrics: string | null;
  pricebookMetrics: string | null;
}

interface IndividualDaysBack {
  opportunities: number;
  quotes: number;
  orders: number;
  invoices: number;
  payments: number;
  creditMemos: number;
}

export default function SetupPage() {
  const [isClient, setIsClient] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [lastUpdateInfo, setLastUpdateInfo] = useState<LastUpdateInfo>({
    opportunities: null,
    quotes: null,
    orders: null,
    invoices: null,
    payments: null,
    creditMemos: null,
    exchangeRates: null,
    productMetrics: null,
    pricebookMetrics: null,
  });
  const [daysBack, setDaysBack] = useState(30);
  const [individualDaysBack, setIndividualDaysBack] = useState<IndividualDaysBack>({
    opportunities: 365,
    quotes: 365,
    orders: 365,
    invoices: 365,
    payments: 365,
    creditMemos: 365,
  });
  const { session } = useAuth();

  // Set client flag and load data from localStorage
  useEffect(() => {
    setIsClient(true);
    
    const savedLastUpdate = localStorage.getItem("lastUpdateInfo");
    if (savedLastUpdate) {
      setLastUpdateInfo(JSON.parse(savedLastUpdate));
    }

    const savedDaysBack = localStorage.getItem("downloadDaysBack");
    if (savedDaysBack) {
      setDaysBack(parseInt(savedDaysBack));
    }

    const savedIndividualDaysBack = localStorage.getItem("individualDaysBack");
    if (savedIndividualDaysBack) {
      setIndividualDaysBack(JSON.parse(savedIndividualDaysBack));
    }
  }, []);

  const updateExchangeRates = async () => {
    if (!session?.access_token) {
      setError("You must be signed in to update exchange rates.");
      return;
    }
    setDownloading(true);
    setError(null);
    setSuccess(null);
    setDownloadProgress(0);
    setCurrentStep("Updating exchange rates...");

    try {
      const response = await fetch('/api/currency/update-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to update exchange rates: ${response.statusText}`);
      }

      const result = await response.json();
      setDownloadProgress(100);
      
      const message = result.warning 
        ? `${result.message} (${result.ratesUpdated} rates)`
        : `Successfully updated ${result.ratesUpdated} exchange rates`;
      
      setSuccess(message);
      
      // Update last update info
      const newLastUpdate = {
        ...lastUpdateInfo,
        exchangeRates: new Date().toISOString(),
      };
      setLastUpdateInfo(newLastUpdate);
      localStorage.setItem("lastUpdateInfo", JSON.stringify(newLastUpdate));

      // Invalidate currency-related caches
      cacheInvalidation.rawData();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update exchange rates');
    } finally {
      setDownloading(false);
      setCurrentStep("");
      setTimeout(() => {
        setDownloadProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };

  const downloadData = async (type: string, days: number) => {
    if (!session?.access_token) {
      setError("You must be signed in to download data.");
      return;
    }
    setDownloading(true);
    setError(null);
    setSuccess(null);
    setDownloadProgress(0);
    setCurrentStep(`Downloading ${type}...`);

    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - days);
      const dateTo = new Date();

      const endpoint = `download-${type}`;
      const response = await fetch(`/api/${type === "opportunities" || type === "quotes" || type === "orders" ? "salesforce" : "netsuite"}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dateFrom: dateFrom.toISOString().split('T')[0],
          dateTo: dateTo.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${type}: ${response.statusText}`);
      }

      const result = await response.json();
      setDownloadProgress(100);
      const count = result.count || result.total || result.successCount || 0;
      setSuccess(`Successfully downloaded ${count} ${type}`);
      
      // Update last update info
      const newLastUpdate = {
        ...lastUpdateInfo,
        [type]: new Date().toISOString(),
      };
      setLastUpdateInfo(newLastUpdate);
      localStorage.setItem("lastUpdateInfo", JSON.stringify(newLastUpdate));

      // Invalidate relevant caches
      if (type === "opportunities" || type === "quotes" || type === "orders") {
        cacheInvalidation.rawData();
      } else if (type === "invoices" || type === "payments") {
        cacheInvalidation.rawData();
      }

      // Revalidate Next.js cache for affected pages
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paths: ['/', '/raw-data', '/flow'] 
        }),
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to download ${type}`);
    } finally {
      setDownloading(false);
      setCurrentStep("");
      setTimeout(() => {
        setDownloadProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };

  const downloadCostMetrics = async (type: string) => {
    if (!session?.access_token) {
      setError("You must be signed in to download cost metrics.");
      return;
    }
    setDownloading(true);
    setError(null);
    setSuccess(null);
    setDownloadProgress(0);
    setCurrentStep(`Downloading ${type}...`);

    try {
      const endpoint = `download-${type}`;
      const response = await fetch(`/api/salesforce/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`Failed to download ${type}: ${response.statusText}`);
      }

      const result = await response.json();
      setDownloadProgress(100);
      setSuccess(result.message || `Successfully downloaded ${type}`);
      
      // Update last update info
      const newLastUpdate = {
        ...lastUpdateInfo,
        [type]: new Date().toISOString(),
      };
      setLastUpdateInfo(newLastUpdate);
      localStorage.setItem("lastUpdateInfo", JSON.stringify(newLastUpdate));

      // Invalidate dashboard cache since cost metrics are used there
      cacheInvalidation.rawData();

      // Revalidate dashboard page
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paths: ['/'] 
        }),
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to download ${type}`);
    } finally {
      setDownloading(false);
      setCurrentStep("");
      setTimeout(() => {
        setDownloadProgress(0);
        setSuccess(null);
      }, 3000);
    }
  };




  const downloadAllData = async () => {
    if (!session?.access_token) {
      setError("You must be signed in to download data.");
      return;
    }
    setDownloading(true);
    setError(null);
    setSuccess(null);
    setDownloadProgress(0);
    setCurrentStep("Starting bulk download...");

    const steps = [
      { type: "quotes", days: individualDaysBack.quotes },
      { type: "opportunities", days: individualDaysBack.opportunities },
      { type: "orders", days: individualDaysBack.orders },
      { type: "invoices", days: individualDaysBack.invoices },
      { type: "payments", days: individualDaysBack.payments },
      { type: "creditMemos", days: individualDaysBack.creditMemos },
    ];

    let completedSteps = 0;

    for (const step of steps) {
      setCurrentStep(`Downloading ${step.type}...`);
      try {
        await downloadData(step.type, step.days);
        completedSteps++;
        setDownloadProgress((completedSteps / steps.length) * 100);
      } catch (err) {
        setError(`Failed to download ${step.type}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        break;
      }
    }

    if (completedSteps === steps.length) {
      setSuccess("All data downloaded successfully!");
      
      // Save settings
      localStorage.setItem("downloadDaysBack", daysBack.toString());
      const newSettings = { ...individualDaysBack };
      localStorage.setItem("individualDaysBack", JSON.stringify(newSettings));

      // Invalidate all caches
      cacheInvalidation.all();

      // Revalidate all pages
      await fetch('/api/revalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paths: ['/', '/raw-data', '/flow', '/setup'] 
        }),
      });
    }

    setDownloading(false);
    setCurrentStep("");
    setTimeout(() => {
      setDownloadProgress(0);
      setSuccess(null);
    }, 5000);
  };

  const getStatusIcon = (lastUpdate: string | null) => {
    if (!lastUpdate) return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    
    const lastUpdateDate = new Date(lastUpdate);
    const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 1) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (daysSinceUpdate < 7) return <Clock className="h-4 w-4 text-yellow-500" />;
    return <AlertCircle className="h-4 w-4 text-red-500" />;
  };

  const getStatusText = (lastUpdate: string | null) => {
    if (!lastUpdate) return "Never downloaded";
    
    const lastUpdateDate = new Date(lastUpdate);
    const daysSinceUpdate = (Date.now() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 1) return "Updated today";
    if (daysSinceUpdate < 2) return "Updated yesterday";
    return `Updated ${Math.floor(daysSinceUpdate)} days ago`;
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Setup</h1>
          <p className="text-muted-foreground">
            Download and sync data from Salesforce and NetSuite
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={downloadAllData}
            disabled={downloading}
            className="flex items-center gap-2"
          >
            {downloading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download All Data
          </Button>
        </div>
      </div>

      {downloading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentStep}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(downloadProgress)}%
                </span>
              </div>
              <Progress value={downloadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Data Downloads Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Download className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Data Downloads</h2>
          <p className="text-muted-foreground">Salesforce and NetSuite data synchronization</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Salesforce Authentication */}
          <SalesforceAuthButton />

        {/* Salesforce Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Salesforce Opportunities</CardTitle>
              {getStatusIcon(lastUpdateInfo.opportunities)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.opportunities)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.opportunities}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    opportunities: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("opportunities", individualDaysBack.opportunities)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Opportunities
            </Button>
          </CardContent>
        </Card>

        {/* Salesforce Quotes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Salesforce Quotes</CardTitle>
              {getStatusIcon(lastUpdateInfo.quotes)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.quotes)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.quotes}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    quotes: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("quotes", individualDaysBack.quotes)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Quotes
            </Button>
          </CardContent>
        </Card>

        {/* Salesforce Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Salesforce Orders</CardTitle>
              {getStatusIcon(lastUpdateInfo.orders)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.orders)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.orders}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    orders: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("orders", individualDaysBack.orders)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Orders
            </Button>
          </CardContent>
        </Card>

        {/* NetSuite Invoices */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">NetSuite Invoices</CardTitle>
              {getStatusIcon(lastUpdateInfo.invoices)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.invoices)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.invoices}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    invoices: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("invoices", individualDaysBack.invoices)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Invoices
            </Button>
          </CardContent>
        </Card>

        {/* NetSuite Payments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">NetSuite Payments</CardTitle>
              {getStatusIcon(lastUpdateInfo.payments)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.payments)}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.payments}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    payments: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("payments", individualDaysBack.payments)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Payments
            </Button>
          </CardContent>
        </Card>

        {/* NetSuite Credit Memos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">NetSuite Credit Memos</CardTitle>
              {getStatusIcon(lastUpdateInfo.creditMemos)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.creditMemos)}
            </p>
            <p className="text-xs text-muted-foreground">
              Used to calculate Credit Memo to Invoice Ratio metric
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={individualDaysBack.creditMemos}
                onChange={(e) =>
                  setIndividualDaysBack(prev => ({
                    ...prev,
                    creditMemos: parseInt(e.target.value) || 365
                  }))
                }
                className="w-16 px-2 py-1 text-sm border rounded"
                min="1"
                max="2000"
              />
              <span className="text-sm text-muted-foreground">days back</span>
            </div>
            <Button
              onClick={() => downloadData("creditMemos", individualDaysBack.creditMemos)}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Download Credit Memos
            </Button>
          </CardContent>
        </Card>

        {/* Exchange Rates */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Exchange Rates
              </CardTitle>
              {getStatusIcon(lastUpdateInfo.exchangeRates)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {getStatusText(lastUpdateInfo.exchangeRates)}
            </p>
            <p className="text-xs text-muted-foreground">
              Updates currency conversion rates for proper sorting in Raw Data tab
            </p>
            <Button
              onClick={updateExchangeRates}
              disabled={downloading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Update Exchange Rates
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Cost Metrics Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold">Cost Metrics</h2>
          <p className="text-muted-foreground">Salesforce product and pricebook metrics for dashboard</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Product Metrics</CardTitle>
                {getStatusIcon(lastUpdateInfo.productMetrics)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {getStatusText(lastUpdateInfo.productMetrics)}
              </p>
              <p className="text-xs text-muted-foreground">
                Downloads product data from Salesforce to calculate "Size of Product Catalogue" metric
              </p>
              <Button
                onClick={() => downloadCostMetrics("product-metrics")}
                disabled={downloading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Download Product Metrics
              </Button>
            </CardContent>
          </Card>

          {/* Pricebook Metrics */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Pricebook Metrics</CardTitle>
                {getStatusIcon(lastUpdateInfo.pricebookMetrics)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {getStatusText(lastUpdateInfo.pricebookMetrics)}
              </p>
              <p className="text-xs text-muted-foreground">
                Downloads pricebook data from Salesforce to calculate "Active Price Books" metric
              </p>
              <Button
                onClick={() => downloadCostMetrics("pricebook-metrics")}
                disabled={downloading}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Download Pricebook Metrics
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}
