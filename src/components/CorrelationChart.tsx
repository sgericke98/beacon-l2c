
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line, LineChart } from "recharts";

export const CorrelationChart = () => {
  const correlationData = [
    { month: "Jan", manualApprovals: 72, q2c: 28.5, rework: 2.8 },
    { month: "Feb", manualApprovals: 69, q2c: 26.8, rework: 2.6 },
    { month: "Mar", manualApprovals: 75, q2c: 29.2, rework: 3.1 },
    { month: "Apr", manualApprovals: 71, q2c: 27.1, rework: 2.4 },
    { month: "May", manualApprovals: 66, q2c: 25.9, rework: 2.2 },
    { month: "Jun", manualApprovals: 68, q2c: 24.5, rework: 2.3 },
  ];

  return (
    <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          Correlation Analysis
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-slate-600">Manual Approvals %</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Q2C Days</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={correlationData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              yAxisId="left"
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Q2C Days', angle: -90, position: 'insideLeft' }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Manual Approvals %', angle: 90, position: 'insideRight' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar 
              yAxisId="right"
              dataKey="manualApprovals" 
              fill="#f97316" 
              opacity={0.7}
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="q2c"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-blue-600">Strong correlation (r=0.78)</span> between manual approvals and Q2C cycle time.
          Reducing manual approvals by 10% could improve Q2C by 2-3 days.
        </p>
      </div>
    </Card>
  );
};
