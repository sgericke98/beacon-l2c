"use client";

import React from "react";
import { FlowDetailsModal } from "../FlowDetailsModal";

interface MetricDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricName: string;
  data: any[];
  loading?: boolean;
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function MetricDetailsModal({
  isOpen,
  onClose,
  metricName,
  data,
  loading = false,
  onSortChange,
}: MetricDetailsModalProps) {
  return (
    <FlowDetailsModal
      isOpen={isOpen}
      onClose={onClose}
      stageTitle={metricName}
      data={data}
      loading={loading}
      onSortChange={onSortChange}
    />
  );
}
