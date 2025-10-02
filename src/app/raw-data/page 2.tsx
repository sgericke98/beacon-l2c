"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTabContent } from "@/components/DataTabContent";
import { useRawData } from "@/hooks/useRawData";
import {
  salesforceOpportunityColumns,
  salesforceQuoteColumns,
  salesforceOrderColumns,
  netsuiteInvoiceColumns,
  netsuitePaymentColumns,
} from "@/lib/tableColumns";
import { DataLoading } from "@/components/ui/page-loading";

export default function RawDataPage() {
  const [activeTab, setActiveTab] = useState<"opportunities" | "quotes" | "orders" | "invoices" | "payments">("opportunities");
  
  // Use the new hook structure with dataType parameter
  const opportunitiesData = useRawData("opportunities");
  const quotesData = useRawData("quotes");
  const ordersData = useRawData("orders");
  const invoicesData = useRawData("invoices");
  const paymentsData = useRawData("payments");
  
  // Target currency is now fixed to USD since conversion happens at database level
  const targetCurrency = "USD";

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "opportunities":
        return opportunitiesData;
      case "quotes":
        return quotesData;
      case "orders":
        return ordersData;
      case "invoices":
        return invoicesData;
      case "payments":
        return paymentsData;
      default:
        return opportunitiesData;
    }
  };

  const currentData = getCurrentData();

  if (currentData.loading && (!currentData.opportunities || currentData.opportunities.length === 0)) {
    return <DataLoading />;
  }

  if (currentData.error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-full mx-auto overflow-hidden">
          <div className="text-center py-12">
            <div className="text-lg text-red-600">Error: {currentData.error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-full mx-auto space-y-6 overflow-hidden">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900">
            Raw Data Explorer
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Explore and analyze your Salesforce and NetSuite data
          </p>
        </div>

        {/* Data Source Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(
              value as "opportunities" | "quotes" | "orders" | "invoices" | "payments"
            )
          }
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="opportunities">
              Salesforce Opportunities
            </TabsTrigger>
            <TabsTrigger value="quotes">Salesforce Quotes</TabsTrigger>
            <TabsTrigger value="orders">Salesforce Orders</TabsTrigger>
            <TabsTrigger value="invoices">NetSuite Invoices</TabsTrigger>
            <TabsTrigger value="payments">NetSuite Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities">
            <DataTabContent
              title="Salesforce Opportunities"
              data={opportunitiesData.opportunities}
              columns={salesforceOpportunityColumns(targetCurrency)}
              sorting={opportunitiesData.sorting}
              onSort={(field) => {
                const direction = opportunitiesData.sorting.field === field && opportunitiesData.sorting.direction === "asc" ? "desc" : "asc";
                opportunitiesData.updateSorting(field, direction);
              }}
              loading={opportunitiesData.loading}
              currentPage={opportunitiesData.currentPage}
              totalPages={Math.ceil(opportunitiesData.totalRecords / opportunitiesData.pageSize)}
              totalCount={opportunitiesData.totalRecords}
              pageSize={opportunitiesData.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={opportunitiesData.updatePagination}
              onPageSizeChange={(pageSize) => opportunitiesData.updatePagination(1, pageSize)}
              showFilters={true}
              filters={opportunitiesData.filters}
              onFiltersChange={opportunitiesData.updateFilters}
              targetCurrency={targetCurrency}
              hideDealSize
              hideDateRange
              filterFields={[
                {
                  key: "customerTier",
                  label: "Customer Tier",
                  options: opportunitiesData.cascadingFilterOptions?.customerTier || [],
                },
                {
                  key: "productType",
                  label: "Customer Type",
                  options: opportunitiesData.cascadingFilterOptions?.productType || [],
                },
                {
                  key: "stage",
                  label: "Stage",
                  options: opportunitiesData.cascadingFilterOptions?.stage || [],
                },
                {
                  key: "region",
                  label: "Region",
                  options: opportunitiesData.cascadingFilterOptions?.region || [],
                },
                {
                  key: "leadType",
                  label: "Lead Type",
                  options: opportunitiesData.cascadingFilterOptions?.leadType || [],
                },
                {
                  key: "customerType",
                  label: "Market Segment",
                  options: opportunitiesData.cascadingFilterOptions?.customerType || [],
                },
              ]}
              emptyMessage="No Salesforce opportunities found in database"
              emptySubMessage="Go to the Setup page to download data from Salesforce"
            />
          </TabsContent>

          <TabsContent value="quotes">
            <DataTabContent
              title="Salesforce Quotes"
              data={quotesData.quotes}
              columns={salesforceQuoteColumns(targetCurrency)}
              sorting={quotesData.sorting}
              onSort={(field) => {
                const direction = quotesData.sorting.field === field && quotesData.sorting.direction === "asc" ? "desc" : "asc";
                quotesData.updateSorting(field, direction);
              }}
              loading={quotesData.loading}
              currentPage={quotesData.currentPage}
              totalPages={Math.ceil(quotesData.totalRecords / quotesData.pageSize)}
              totalCount={quotesData.totalRecords}
              pageSize={quotesData.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={quotesData.updatePagination}
              onPageSizeChange={(pageSize) => quotesData.updatePagination(1, pageSize)}
              showFilters={true}
              filters={quotesData.filters}
              onFiltersChange={quotesData.updateFilters}
              targetCurrency={targetCurrency}
              hideDealSize
              hideDateRange
              filterFields={[
                {
                  key: "status",
                  label: "Status",
                  options: quotesData.cascadingFilterOptions?.status || [],
                },
                {
                  key: "leadType",
                  label: "Lead Type",
                  options: quotesData.cascadingFilterOptions?.leadType || [],
                },
                {
                  key: "country",
                  label: "Country",
                  options: quotesData.cascadingFilterOptions?.country || [],
                },
                {
                  key: "paymentTerms",
                  label: "Payment Terms",
                  options: quotesData.cascadingFilterOptions?.paymentTerms || [],
                },
                {
                  key: "billingFrequency",
                  label: "Billing Frequency",
                  options: quotesData.cascadingFilterOptions?.billingFrequency || [],
                },
              ]}
              emptyMessage="No quotes found. Please download quotes from the Setup page."
            />
          </TabsContent>

          <TabsContent value="orders">
            <DataTabContent
              title="Salesforce Orders"
              data={ordersData.orders}
              columns={salesforceOrderColumns(targetCurrency)}
              sorting={ordersData.sorting}
              onSort={(field) => {
                const direction = ordersData.sorting.field === field && ordersData.sorting.direction === "asc" ? "desc" : "asc";
                ordersData.updateSorting(field, direction);
              }}
              loading={ordersData.loading}
              currentPage={ordersData.currentPage}
              totalPages={Math.ceil(ordersData.totalRecords / ordersData.pageSize)}
              totalCount={ordersData.totalRecords}
              pageSize={ordersData.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={ordersData.updatePagination}
              onPageSizeChange={(pageSize) => ordersData.updatePagination(1, pageSize)}
              showFilters={true}
              filters={ordersData.filters}
              onFiltersChange={ordersData.updateFilters}
              targetCurrency={targetCurrency}
              hideDealSize
              hideDateRange
              filterFields={[
                {
                  key: "status",
                  label: "Status",
                  options: ordersData.cascadingFilterOptions?.status || [],
                },
                {
                  key: "orderType",
                  label: "Order Type",
                  options: ordersData.cascadingFilterOptions?.orderType || [],
                },
                {
                  key: "billingFrequency",
                  label: "Billing Frequency",
                  options: ordersData.cascadingFilterOptions?.billingFrequency || [],
                },
                {
                  key: "region",
                  label: "Region",
                  options: ordersData.cascadingFilterOptions?.region || [],
                },
              ]}
              emptyMessage="No orders found. Please download orders from the Setup page."
            />
          </TabsContent>

          <TabsContent value="invoices">
            <DataTabContent
              title="NetSuite Invoices"
              data={invoicesData.invoices}
              columns={netsuiteInvoiceColumns}
              sorting={invoicesData.sorting}
              onSort={(field) => {
                const direction = invoicesData.sorting.field === field && invoicesData.sorting.direction === "asc" ? "desc" : "asc";
                invoicesData.updateSorting(field, direction);
              }}
              loading={invoicesData.loading}
              currentPage={invoicesData.currentPage}
              totalPages={Math.ceil(invoicesData.totalRecords / invoicesData.pageSize)}
              totalCount={invoicesData.totalRecords}
              pageSize={invoicesData.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={invoicesData.updatePagination}
              onPageSizeChange={(pageSize) => invoicesData.updatePagination(1, pageSize)}
              showFilters={true}
              filters={invoicesData.filters}
              onFiltersChange={invoicesData.updateFilters}
              targetCurrency={targetCurrency}
              hideDealSize
              hideDateRange
              filterFields={[
                {
                  key: "status",
                  label: "Status",
                  options: invoicesData.cascadingFilterOptions?.status || [],
                },
              ]}
              emptyMessage="No NetSuite invoices found"
            />
          </TabsContent>

          <TabsContent value="payments">
            <DataTabContent
              title="NetSuite Payments"
              data={paymentsData.payments}
              columns={netsuitePaymentColumns}
              sorting={paymentsData.sorting}
              onSort={(field) => {
                const direction = paymentsData.sorting.field === field && paymentsData.sorting.direction === "asc" ? "desc" : "asc";
                paymentsData.updateSorting(field, direction);
              }}
              loading={paymentsData.loading}
              currentPage={paymentsData.currentPage}
              totalPages={Math.ceil(paymentsData.totalRecords / paymentsData.pageSize)}
              totalCount={paymentsData.totalRecords}
              pageSize={paymentsData.pageSize}
              pageSizeOptions={[10, 25, 50, 100]}
              onPageChange={paymentsData.updatePagination}
              onPageSizeChange={(pageSize) => paymentsData.updatePagination(1, pageSize)}
              showFilters={true}
              filters={paymentsData.filters}
              onFiltersChange={paymentsData.updateFilters}
              targetCurrency={targetCurrency}
              hideDealSize
              hideDateRange
              filterFields={[
                {
                  key: "status",
                  label: "Status",
                  options: paymentsData.cascadingFilterOptions?.status || [],
                },
              ]}
              emptyMessage="No NetSuite payments found"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
