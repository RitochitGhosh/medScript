"use client";

import { useMemo } from "react";

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface Props {
  activity: DayData[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensity(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/20";
  if (count <= 5) return "bg-primary/45";
  if (count <= 10) return "bg-primary/70";
  return "bg-primary";
}

export function ActivityHeatmap({ activity }: Props) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a map from date string to count
    const countMap = new Map<string, number>();
    for (const d of activity) {
      countMap.set(d.date, d.count);
    }

    // Go back 52 weeks (364 days) + align to Sunday start
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Move to the nearest Sunday before or on startDate
    startDate.setDate(startDate.getDate() - startDate.getDay());

    const weeks: { date: Date; count: number }[][] = [];
    const monthLabels: { label: string; col: number }[] = [];

    let currentWeek: { date: Date; count: number }[] = [];
    let col = 0;
    let lastMonth = -1;

    const cursor = new Date(startDate);
    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0]!;
      const count = countMap.get(dateStr) ?? 0;
      currentWeek.push({ date: new Date(cursor), count });

      const month = cursor.getMonth();
      if (month !== lastMonth && cursor.getDay() === 0) {
        monthLabels.push({ label: MONTHS[month]!, col });
        lastMonth = month;
      }

      cursor.setDate(cursor.getDate() + 1);
      if (cursor.getDay() === 0) {
        weeks.push(currentWeek);
        currentWeek = [];
        col++;
      }
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);

    return { weeks, monthLabels };
  }, [activity]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[680px]">
        {/* Month labels */}
        <div className="flex mb-1 ml-8" style={{ gap: "3px" }}>
          {monthLabels.map(({ label, col }, i) => (
            <div
              key={i}
              className="text-[10px] text-muted-foreground"
              style={{ position: "absolute", marginLeft: `${32 + col * 15}px` }}
            >
              {label}
            </div>
          ))}
          <div className="h-4" />
        </div>

        <div className="flex gap-0.5">
          {/* Day labels */}
          <div className="flex flex-col gap-0.5 mr-1.5">
            {DAYS.map((day, i) => (
              <div key={i} className="text-[10px] text-muted-foreground h-[11px] leading-[11px] w-6 text-right">
                {day}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, di) => {
                const day = week[di];
                if (!day) {
                  return <div key={di} className="w-[11px] h-[11px]" />;
                }
                const label = `${day.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}: ${day.count} consultation${day.count !== 1 ? "s" : ""}`;
                return (
                  <div
                    key={di}
                    title={label}
                    className={`w-[11px] h-[11px] rounded-sm ${getIntensity(day.count)} transition-opacity hover:opacity-80 cursor-default`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 ml-8">
          <span className="text-[10px] text-muted-foreground">Less</span>
          {["bg-muted", "bg-primary/20", "bg-primary/45", "bg-primary/70", "bg-primary"].map((cls, i) => (
            <div key={i} className={`w-[11px] h-[11px] rounded-sm ${cls}`} />
          ))}
          <span className="text-[10px] text-muted-foreground">More</span>
        </div>
      </div>
    </div>
  );
}
