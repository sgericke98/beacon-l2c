"use client";

import { useState, useCallback, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTabContent } from "@/components/DataTabContent";
import { useRawDataMaterializedViews, DataType } from "@/hooks/useRawDataMaterializedViews";
import {
  opportunityColumns,
  quoteColumns,
  orderColumns,
  invoiceColumns,
  paymentColumns,
  creditMemoColumns,
} from "@/lib/tableColumnsMaterializedViews";
import { DataLoading } from "@/components/ui/page-loading";

// Data type configurations for UI
const DATA_TYPE_CONFIG = {
  opportunities: {
    title: "Salesforce Opportunities",
    columns: opportunityColumns,
  },
  quotes: {
    title: "Salesforce Quotes",
    columns: quoteColumns,
  },
  orders: {
    title: "Salesforce Orders",
    columns: orderColumns,
  },
  invoices: {
    title: "NetSuite Invoices",
    columns: invoiceColumns,
  },
  payments: {
    title: "NetSuite Payments",
    columns: paymentColumns,
  },
  credit_memos: {
    title: "NetSuite Credit Memos",
    columns: creditMemoColumns,
  },
};

export default function RawDataMaterializedPage() {
  const [activeTab, setActiveTab] = useState<DataType>("opportunities");
  
  // Get the configuration for the active tab
  const config = DATA_TYPE_CONFIG[activeTab as keyof typeof DATA_TYPE_CONFIG];
  
  // Use the optimized hook for the active tab only
  const rawData = useRawDataMaterializedViews(activeTab);

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    if (rawData.isValidDataType(value)) {
      setActiveTab(value);
    }
  }, [rawData.isValidDataType]);

  // Memoized tab content to prevent unnecessary re-renders
  const tabContent = useMemo(() => {
    if (rawData.loading) {
      return <DataLoading />;
    }

    return (
      <div>
        <DataTabContent
          title={config.title}
          data={rawData.data}
          columns={config.columns}
          loading={rawData.loading}
          currentPage={rawData.currentPage}
          pageSize={rawData.pageSize}
          totalPages={rawData.totalPages}
          totalCount={rawData.totalRecords}
          pageSizeOptions={[25, 50, 100]}
          onPageChange={(page) => rawData.updatePagination(page, rawData.pageSize)}
          onPageSizeChange={(pageSize) => rawData.updatePagination(rawData.currentPage, pageSize)}
          filters={rawData.filters}
          onFiltersChange={rawData.updateFilters}
          emptyMessage={`No ${config.title.toLowerCase()} found`}
        />
      </div>
    );
  }, [
    rawData,
    config,
    activeTab,
  ]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Raw Data</h1>
        <p className="text-muted-foreground mt-2">
          Explore raw data from Salesforce and NetSuite
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="credit_memos">Credit Memos</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-6">
          {activeTab === "opportunities" && tabContent}
        </TabsContent>

        <TabsContent value="quotes" className="mt-6">
          {activeTab === "quotes" && tabContent}
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          {activeTab === "orders" && tabContent}
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          {activeTab === "invoices" && tabContent}
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          {activeTab === "payments" && tabContent}
        </TabsContent>

        <TabsContent value="credit_memos" className="mt-6">
          {activeTab === "credit_memos" && tabContent}
        </TabsContent>
      </Tabs>
    </div>
  );
}
