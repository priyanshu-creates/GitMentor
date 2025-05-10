// src/components/language-chart.tsx
"use client";

import type { GitHubRepository } from "@/services/github";
import React from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from "recharts";
import { useTheme } from "next-themes";

interface LanguageChartProps {
  repositories: GitHubRepository[];
}

// Using HSL values from globals.css for chart colors to ensure theme consistency
const COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(190, 50%, 50%)", // Additional distinct colors if needed
  "hsl(250, 60%, 60%)",
  "hsl(50, 70%, 55%)",
  "hsl(310, 55%, 58%)"
];

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="text-lg font-semibold">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="hsl(var(--foreground))" className="text-sm">{`${value} repos`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="hsl(var(--muted-foreground))" className="text-xs">
        {`( ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};


const LanguageChart: React.FC<LanguageChartProps> = ({ repositories }) => {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const { resolvedTheme } = useTheme();

  const languageCounts = repositories.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(languageCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value); 

  if (chartData.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No language data available to display chart.</p>;
  }

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const tooltipBackgroundColor = resolvedTheme === 'dark' ? 'hsl(var(--accent))' : 'hsl(var(--card))';
  const tooltipColor = resolvedTheme === 'dark' ? 'hsl(var(--accent-foreground))' : 'hsl(var(--card-foreground))';


  return (
    <div style={{ width: '100%', height: 350 }}> {/* Increased height for better label display */}
      <ResponsiveContainer>
        <PieChart>
          <Pie
            activeIndex={activeIndex}
            activeShape={renderActiveShape}
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60} // Made it a donut chart
            outerRadius={100} // Increased outer radius
            fill="hsl(var(--accent))" // Default fill from accent
            dataKey="value"
            nameKey="name"
            onMouseEnter={onPieEnter}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: tooltipBackgroundColor, 
              color: tooltipColor,
              borderRadius: 'var(--radius)',
              border: `1px solid ${resolvedTheme === 'dark' ? 'hsl(var(--accent-foreground))' : 'hsl(var(--border))'}`,
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            }} 
            formatter={(value: number, name: string) => [`${value} repos`, name]}
            cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }} 
          />
          <Legend 
            iconSize={10} 
            wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} 
            formatter={(value) => <span style={{ color: 'hsl(var(--muted-foreground))' }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LanguageChart;
