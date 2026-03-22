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
// 7 rows: Sun–Sat. Show Mon, Wed, Fri labels on rows 1, 3, 5 (0-indexed).
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

// Each cell = 11px wide + 2px gap = 13px per column
const COL_WIDTH = 13;
// Day-label column width (w-6 = 24px + mr-1.5 = 6px = 30px total)
const DAY_COL_WIDTH = 30;

function getIntensity(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 2) return "bg-primary/25";
  if (count <= 5) return "bg-primary/50";
  if (count <= 10) return "bg-primary/75";
  return "bg-primary";
}

export function ActivityHeatmap({ activity }: Props) {
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countMap = new Map<string, number>();
    for (const d of activity) countMap.set(d.date, d.count);

    // Start 52 full weeks ago, aligned to Sunday
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
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

      // Emit month label on the first Sunday of a new month
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

  const totalConsultations = useMemo(
    () => activity.reduce((sum, d) => sum + d.count, 0),
    [activity]
  );

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${DAY_COL_WIDTH + weeks.length * COL_WIDTH + 16}px` }}>

        {/* Month labels — positioned relative to the grid, offset by day-label column */}
        <div
          className="relative h-5 mb-1"
          style={{ marginLeft: `${DAY_COL_WIDTH}px` }}
        >
          {monthLabels.map(({ label, col }, i) => (
            <span
              key={i}
              className="absolute text-[10px] text-muted-foreground select-none"
              style={{ left: `${col * COL_WIDTH}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Grid rows */}
        <div className="flex gap-0.5">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-0.5 mr-1.5 w-6 shrink-0">
            {DAY_LABELS.map((day, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground h-[11px] leading-[11px] text-right select-none"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Columns (weeks) */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, di) => {
                const day = week[di];
                if (!day) {
                  // Pad partial first/last week
                  return <div key={di} className="w-[11px] h-[11px]" />;
                }
                const label = `${day.date.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}: ${day.count} consultation${day.count !== 1 ? "s" : ""}`;
                return (
                  <div
                    key={di}
                    title={label}
                    className={`w-[11px] h-[11px] rounded-[2px] ${getIntensity(day.count)} transition-opacity hover:opacity-70 cursor-default`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer: legend + total */}
        <div className="flex items-center justify-between mt-3" style={{ marginLeft: `${DAY_COL_WIDTH}px` }}>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Less</span>
            {(["bg-muted", "bg-primary/25", "bg-primary/50", "bg-primary/75", "bg-primary"] as const).map(
              (cls, i) => (
                <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${cls}`} />
              )
            )}
            <span className="text-[10px] text-muted-foreground">More</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {totalConsultations} consultation{totalConsultations !== 1 ? "s" : ""} in the last year
          </span>
        </div>
      </div>
    </div>
  );
}
