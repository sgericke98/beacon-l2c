import React from "react";
import { Target, BarChart3, TrendingUp, Clock, Info } from "lucide-react";
import { FlowNode } from "./FlowNode";
import { FlowLine } from "./FlowLine";
import { STAGE_METRIC_MAP } from "@/lib/flowConstants";

interface FlowVisualizationProps {
  flowData: any;
  getStageMetrics: (stage: string) => any;
  onStageClick: (stage: string) => void;
  calculate90thPercentile?: (data: any[], field: string) => string;
}

const FLOW_STAGES = [
  {
    key: "opportunity",
    title: "Opportunity Created",
    description: "Lead qualification and initial contact established",
    icon: Target,
  },
  {
    key: "quote",
    title: "Quote Generated", 
    description: "Detailed pricing proposal and terms created",
    icon: BarChart3,
  },
  {
    key: "order",
    title: "Order Confirmed",
    description: "Customer commitment and order processing initiated", 
    icon: TrendingUp,
  },
  {
    key: "invoice",
    title: "Invoice Created",
    description: "Billing document generated and sent to customer",
    icon: Info,
  },
  {
    key: "payment",
    title: "Payment Received",
    description: "Transaction completed and revenue recognized",
    icon: Clock,
  },
];

export const FlowVisualization: React.FC<FlowVisualizationProps> = ({
  flowData,
  getStageMetrics,
  onStageClick,
  calculate90thPercentile,
}) => {
  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="flex items-center w-full max-w-7xl px-2">
        <div className="flex items-center justify-between w-full gap-2">
          {FLOW_STAGES.map((stage, index) => (
            <React.Fragment key={stage.key}>
              <FlowNode
                title={stage.title}
                description={stage.description}
                icon={stage.icon}
              />
              {index < FLOW_STAGES.length - 1 && (
                <FlowLine
                  metricKey={STAGE_METRIC_MAP[stage.key as keyof typeof STAGE_METRIC_MAP]}
                  getStageMetrics={getStageMetrics}
                  flowData={flowData}
                  onClick={() => onStageClick(STAGE_METRIC_MAP[stage.key as keyof typeof STAGE_METRIC_MAP])}
                  calculate90thPercentile={calculate90thPercentile}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
