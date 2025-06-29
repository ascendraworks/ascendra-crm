import React, { useState } from 'react';

interface FunnelStageData {
  stage: string;
  count: number;
  value: number;
  color: string;
  percentage: number;
}

interface FunnelChartProps {
  stages: FunnelStageData[];
  totalLeads: number;
}

const FunnelChart: React.FC<FunnelChartProps> = ({ stages, totalLeads }) => {
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Color mapping for consistent colors across both charts
  const stageColors = {
    'New': '#3b82f6', // blue-500
    'Contacted': '#eab308', // yellow-500
    'Qualified': '#f97316', // orange-500
    'Closed Won': '#22c55e', // green-500
    'Closed Lost': '#ef4444' // red-500
  };

  // Calculate total value for pie chart
  const totalValue = stages.reduce((sum, stage) => sum + stage.value, 0);

  // Filter out stages with 0 leads for cleaner visualization
  const activeStages = stages.filter(stage => stage.count > 0);
  const hasData = activeStages.length > 0;

  // If no data, show empty state
  if (!hasData) {
    return (
      <div className="w-full">
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Pipeline Data Yet</h3>
          <p className="text-slate-600 mb-4">Add some leads to see your funnel visualization and stage distribution.</p>
          <button
            onClick={() => window.location.href = '/funnel'}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Leads</span>
          </button>
        </div>
      </div>
    );
  }

  // Generate funnel segments with proportional sizing
  const generateFunnelPath = () => {
    const segments = [];
    const totalHeight = 300;
    const topWidth = 400;
    const bottomWidth = 80;
    const segmentHeight = totalHeight / activeStages.length;

    activeStages.forEach((stage, index) => {
      const y1 = index * segmentHeight;
      const y2 = (index + 1) * segmentHeight;
      
      // Calculate proportional widths
      const progress1 = y1 / totalHeight;
      const progress2 = y2 / totalHeight;
      
      const width1 = topWidth - (progress1 * (topWidth - bottomWidth));
      const width2 = topWidth - (progress2 * (topWidth - bottomWidth));
      
      const x1Left = 200 - width1 / 2;
      const x1Right = 200 + width1 / 2;
      const x2Left = 200 - width2 / 2;
      const x2Right = 200 + width2 / 2;

      segments.push({
        path: `M ${x1Left} ${y1} L ${x1Right} ${y1} L ${x2Right} ${y2} L ${x2Left} ${y2} Z`,
        color: stageColors[stage.stage as keyof typeof stageColors],
        stage: stage.stage,
        count: stage.count,
        value: stage.value,
        percentage: Math.round((stage.count / totalLeads) * 100),
        centerX: 200,
        centerY: y1 + segmentHeight / 2
      });
    });

    return segments;
  };

  // Generate pie chart segments
  const generatePieSegments = () => {
    const segments = [];
    let currentAngle = -90; // Start from top
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    activeStages.forEach((stage) => {
      const percentage = (stage.count / totalLeads) * 100;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      segments.push({
        path: pathData,
        color: stageColors[stage.stage as keyof typeof stageColors],
        stage: stage.stage,
        count: stage.count,
        value: stage.value,
        percentage: Math.round(percentage)
      });

      currentAngle += angle;
    });

    return segments;
  };

  const funnelSegments = generateFunnelPath();
  const pieSegments = generatePieSegments();

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div className="w-full">
      {/* Charts Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
        
        {/* Inverted Funnel Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">Sales Funnel</h3>
          
          <div className="flex justify-center mb-4 relative">
            <svg 
              width="400" 
              height="320" 
              viewBox="0 0 400 320" 
              className="max-w-full"
              onMouseMove={handleMouseMove}
            >
              {funnelSegments.map((segment, index) => (
                <path
                  key={index}
                  d={segment.path}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:brightness-110"
                  onMouseEnter={() => setHoveredSegment(segment.stage)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              ))}
            </svg>

            {/* Tooltip */}
            {hoveredSegment && (
              <div 
                className="fixed z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm pointer-events-none"
                style={{
                  left: mousePosition.x + 10,
                  top: mousePosition.y - 10,
                  transform: 'translate(0, -100%)'
                }}
              >
                {(() => {
                  const segment = funnelSegments.find(s => s.stage === hoveredSegment);
                  return segment ? (
                    <div className="space-y-1">
                      <div className="font-semibold">{segment.stage}</div>
                      <div>{segment.count} leads ({segment.percentage}%)</div>
                      <div className="font-medium">${segment.value.toLocaleString()}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 text-center">Stage Distribution</h3>
          
          <div className="flex justify-center mb-4 relative">
            <svg 
              width="200" 
              height="200" 
              viewBox="0 0 200 200" 
              className="max-w-full"
              onMouseMove={handleMouseMove}
            >
              {pieSegments.map((segment, index) => (
                <path
                  key={index}
                  d={segment.path}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer transition-all duration-200 hover:brightness-110"
                  onMouseEnter={() => setHoveredSegment(segment.stage)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              ))}
            </svg>

            {/* Tooltip for pie chart */}
            {hoveredSegment && (
              <div 
                className="fixed z-50 bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-sm pointer-events-none"
                style={{
                  left: mousePosition.x + 10,
                  top: mousePosition.y - 10,
                  transform: 'translate(0, -100%)'
                }}
              >
                {(() => {
                  const segment = pieSegments.find(s => s.stage === hoveredSegment);
                  return segment ? (
                    <div className="space-y-1">
                      <div className="font-semibold">{segment.stage}</div>
                      <div>{segment.count} leads ({segment.percentage}%)</div>
                      <div className="font-medium">${segment.value.toLocaleString()}</div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Concise Legend */}
      <div className="bg-slate-50 rounded-xl p-6">
        <div className="flex flex-wrap justify-center gap-6">
          {activeStages.map((stage, index) => {
            const percentage = Math.round((stage.count / totalLeads) * 100);
            return (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: stageColors[stage.stage as keyof typeof stageColors] }}
                />
                <span className="text-sm font-medium text-slate-900">
                  {stage.stage} ({percentage}%)
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Summary */}
        <div className="mt-4 pt-4 border-t border-slate-200 text-center">
          <span className="text-sm font-medium text-slate-900">
            Total Pipeline: {totalLeads} leads • ${totalValue.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FunnelChart;