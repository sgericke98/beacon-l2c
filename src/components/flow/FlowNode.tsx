import React from "react";
import { LucideIcon } from "lucide-react";

interface FlowNodeProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FlowNode: React.FC<FlowNodeProps> = ({ title, description, icon: Icon }) => {
  return (
    <div className="flow-node relative bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-xl p-4 min-w-[160px] max-w-[160px] h-[200px] text-center shadow-lg border border-white/20 flex flex-col justify-center z-20">
      <div className="relative z-10">
        <div className="flex justify-center mb-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
        </div>
        <h3 className="font-semibold text-xs mb-1 leading-tight">{title}</h3>
        <p className="text-xs opacity-90 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};
