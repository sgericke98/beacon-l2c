
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export const TrendChart = () => {
  const trendData = [
    { month: "Jan", q2c: 28.5, target: 20 },
    { month: "Feb", q2c: 26.8, target: 20 },
    { month: "Mar", q2c: 29.2, target: 20 },
    { month: "Apr", q2c: 27.1, target: 20 },
    { month: "May", q2c: 25.9, target: 20 },
    { month: "Jun", q2c: 24.5, target: 20 },
  ];

  return (
    <Card className="p-6 bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-800">
          Q2C Cycle Time Trend
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-slate-600">Actual</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-600">Target</span>
          </div>
        </div>
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="month" 
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis 
              stroke="#64748b"
              fontSize={12}
              label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <ReferenceLine 
              y={20} 
              stroke="#10b981" 
              strokeDasharray="5 5"
              label="Target"
            />
            <Line
              type="monotone"
              dataKey="q2c"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              activeDot={{ r: 8, fill: '#1d4ed8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold text-green-600">↓ 12% improvement</span> over the last 6 months.
          Target achievement expected by Q3.
        </p>
      </div>
    </Card>
  );
};
