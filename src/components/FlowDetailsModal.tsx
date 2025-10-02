import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { MetricDetailsTable } from "./MetricDetailsTable";

interface FlowDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stageTitle: string;
  data: any[];
  loading?: boolean;
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function FlowDetailsModal({
  isOpen,
  onClose,
  stageTitle,
  data,
  loading = false,
  onSortChange,
}: FlowDetailsModalProps) {

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {stageTitle} - Detailed Data
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Showing {data.length} records for this stage of the process
          </DialogDescription>
        </DialogHeader>

        <MetricDetailsTable
          metricName={stageTitle}
          data={data}
          loading={loading}
          onSortChange={onSortChange}
        />
      </DialogContent>
    </Dialog>
  );
}
