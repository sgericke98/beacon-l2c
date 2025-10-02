
import { Card } from "@/components/ui/card";

export const RootCauseSection = () => {
  const rootCauseData = [
    {
      title: "Quote Approval Time",
      value: 8.2,
      unit: "days",
      description: "Average time to approve quotes",
      trend: "up",
      impact: "high",
    },
    {
      title: "Missing Fields",
      value: 24,
      unit: "%",
      description: "Opportunities with incomplete data",
      trend: "neutral",
      impact: "medium",
    },
    {
      title: "Days Sales Outstanding",
      value: 45.7,
      unit: "days",
      description: "Average collection period",
      trend: "up",
      impact: "high",
    },
    {
      title: "Credit Memos to Order Ratio",
      value: 3.2,
      unit: "%",
      description: "Credit memos as % of total orders",
      trend: "down",
      impact: "medium",
    },
  ];

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-green-200 bg-green-50";
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Root Cause Analysis
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {rootCauseData.map((item, index) => (
          <Card
            key={index}
            className={`p-4 border-2 ${getImpactColor(item.impact)} hover:shadow-lg transition-all duration-300 hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700 text-sm">
                {item.title}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                item.impact === 'high' ? 'bg-red-100 text-red-700' :
                item.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {item.impact.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-2xl font-bold text-slate-800">
                {item.value}
              </span>
              <span className="text-sm text-slate-500">
                {item.unit}
              </span>
            </div>
            
            <p className="text-xs text-slate-600">
              {item.description}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
};
