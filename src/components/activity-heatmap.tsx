// src/components/activity-heatmap.tsx
"use client";

import type { GitHubActivityDay } from "@/services/github";
import React, { useState, useEffect, useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  data: GitHubActivityDay[];
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    // This effect ensures the component re-renders if the date changes,
    // though for this specific heatmap (last 365 days), it's mostly for initial setup.
    // If we wanted a heatmap that dynamically shifts with the current date without full data reload,
    // this would be more relevant.
    setCurrentDate(new Date());
  }, []);


  const { processedData, startDate, endDate, maxContributions, daysArray, weeksArray, monthLabelsPositions } = useMemo(() => {
    if (data.length === 0) {
      return { 
        processedData: new Map(), 
        startDate: null, 
        endDate: null, 
        maxContributions: 0, 
        daysArray: [], 
        weeksArray: [],
        monthLabelsPositions: []
      };
    }

    const contributionsMap = new Map<string, number>();
    let max = 0;
    data.forEach(day => {
      contributionsMap.set(day.date, day.contributions);
      if (day.contributions > max) {
        max = day.contributions;
      }
    });
    
    const end = new Date(currentDate);
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - 364); // 52 weeks * 7 days - 1 day (Total 365 days)
    
    const days: Date[] = [];
    let iterDate = new Date(start);
    while (iterDate <= end) {
      days.push(new Date(iterDate));
      iterDate.setDate(iterDate.getDate() + 1);
    }

    // Pad with placeholder days at the beginning to align Sunday (0) to the first row
    const firstDayOfWeek = start.getDay(); // 0 for Sunday
    const paddedDays = [...Array(firstDayOfWeek).fill(null), ...days];
    
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weeks.push(paddedDays.slice(i, i + 7));
    }

    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthPos: { label: string; weekIndex: number }[] = [];
    let currentMonth = -1;
    weeks.forEach((week, weekIndex) => {
        const firstNonNullDayInWeek = week.find(d => d !== null);
        if (firstNonNullDayInWeek) {
            const month = firstNonNullDayInWeek.getMonth();
            if (month !== currentMonth) {
                monthPos.push({ label: monthLabels[month], weekIndex });
                currentMonth = month;
            }
        }
    });

    return { 
      processedData: contributionsMap, 
      startDate: start, 
      endDate: end, 
      maxContributions: max,
      daysArray: days, // original unpadded days for rendering actual cells
      weeksArray: weeks, // Padded weeks for grid structure
      monthLabelsPositions: monthPos
    };

  }, [data, currentDate]);


  if (!startDate || !endDate || daysArray.length === 0) {
    return <div className="text-center text-muted-foreground py-8">Loading heatmap data or no data available...</div>;
  }
  
  const getContributionColor = (contributions: number) => {
    if (contributions <= 0) return "bg-muted/30 hover:bg-muted/50";
    if (maxContributions === 0) return "bg-accent/20 hover:bg-accent/40";
    
    // Fuller range of colors, more emphasis on lower contributions
    const intensity = contributions / maxContributions;
    if (intensity < 0.01) return "bg-muted/30 hover:bg-muted/50"; // For 0 explicitly, handled above
    if (intensity <= 0.2) return "bg-accent/20 hover:bg-accent/30"; // Very light teal
    if (intensity <= 0.4) return "bg-accent/40 hover:bg-accent/50"; 
    if (intensity <= 0.6) return "bg-accent/60 hover:bg-accent/70";
    if (intensity <= 0.8) return "bg-accent/80 hover:bg-accent/90";
    return "bg-accent hover:bg-accent/95"; // Darkest teal
  };


  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-x-auto p-1">
        <div className="flex justify-start mb-2 space-x-4 pl-[30px]"> {/* Adjust pl for day labels */}
            {monthLabelsPositions.map(({ label, weekIndex }) => (
                <div key={`month-${label}-${weekIndex}`} className="text-xs text-muted-foreground min-w-[15px] text-center" style={{ gridColumnStart: weekIndex +1 }}>
                    {label}
                </div>
            ))}
        </div>
        <div className="flex">
            <div className="grid grid-rows-7 gap-y-[2px] pr-1 shrink-0 text-xs text-muted-foreground">
                {["", "Mon", "", "Wed", "", "Fri", ""].map((dayLabel, i) => (
                    <div key={`daylabel-${i}`} className="h-[11px] w-[25px] text-right leading-[11px]">{dayLabel}</div>
                ))}
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-[2px]">
                {weeksArray.flat().map((day, index) => {
                if (!day) {
                    return <div key={`empty-${index}`} className="h-[11px] w-[11px] rounded-sm bg-transparent" />;
                }
                const dateString = day.toISOString().split("T")[0];
                const contributions = processedData.get(dateString) || 0;
                return (
                    <Tooltip key={dateString}>
                    <TooltipTrigger asChild>
                        <div
                        className={cn(
                            "h-[11px] w-[11px] rounded-sm cursor-default transition-colors duration-150",
                            getContributionColor(contributions)
                        )}
                        data-date={dateString}
                        data-contributions={contributions}
                        />
                    </TooltipTrigger>
                    <TooltipContent className="bg-popover text-popover-foreground p-2 rounded shadow-lg">
                        <p className="text-sm font-medium">{contributions} contribution{contributions !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-muted-foreground">{day.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </TooltipContent>
                    </Tooltip>
                );
                })}
            </div>
        </div>
        <div className="flex justify-end items-center space-x-1 mt-2 text-xs text-muted-foreground pr-2">
            <span>Less</span>
            <div className="h-3 w-3 rounded-sm bg-muted/30"></div>
            <div className="h-3 w-3 rounded-sm bg-accent/20"></div>
            <div className="h-3 w-3 rounded-sm bg-accent/40"></div>
            <div className="h-3 w-3 rounded-sm bg-accent/70"></div>
            <div className="h-3 w-3 rounded-sm bg-accent"></div>
            <span>More</span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ActivityHeatmap;
