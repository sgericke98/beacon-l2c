import React from "react";
import { FlowDetailsModal } from "./FlowDetailsModal";

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
  
  // Both tabs now use the same data structure from the flow API
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
