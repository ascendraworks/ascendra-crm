import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  currentValue: number;
  format?: 'currency' | 'number' | 'percentage';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  tooltip?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  currentValue, 
  format = 'number',
  icon,
  trend,
  tooltip
}) => {
  
  const formatValue = (value: number) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'percentage':
        return `${value}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.isPositive) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (!trend.isPositive && trend.value !== 0) return <TrendingDown className="h-4 w-4 text-orange-500" />;
    return <Minus className="h-4 w-4 text-slate-400" />;
  };

  const getTrendColor = () => {
    if (!trend) return 'text-slate-600';
    if (trend.isPositive) return 'text-green-600';
    if (!trend.isPositive && trend.value !== 0) return 'text-orange-600';
    return 'text-slate-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {icon && (
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <p className="text-slate-600 text-sm font-medium">{title}</p>
              {tooltip && (
                <div className="group relative">
                  <Info className="h-4 w-4 text-slate-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                    {tooltip}
                  </div>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatValue(currentValue)}</p>
          </div>
        </div>
        
        {trend && (
          <div className="text-right">
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-semibold ${getTrendColor()}`}>
                {trend.label || (trend.value > 0 ? `+${trend.value}` : trend.value.toString())}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;