"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from "recharts";

interface BarEntry {
  label: string;   // "Mon 17"
  fullLabel: string; // "Monday, 17 Mar"
  count: number;
  isToday: boolean;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

function DayTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload as BarEntry | undefined;
  if (!entry) return null;

  return (
    <div
      style={{
        background: "var(--background, #fff)",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 2 }}>{entry.fullLabel}</p>
      <p style={{ color: "#059669" }}>
        {entry.count} consultation{entry.count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

// ── Helper: build last-7-days skeleton ───────────────────────────────────────

function buildDays(rawData: { date: string; count: number }[]): BarEntry[] {
  const countMap = new Map<string, number>();
  for (const d of rawData) countMap.set(d.date, d.count);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries: BarEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0]!;
    entries.push({
      label: date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
      fullLabel: date.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "short",
      }),
      count: countMap.get(dateStr) ?? 0,
      isToday: i === 0,
    });
  }
  return entries;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Props kept for backwards-compat with dashboard/page.tsx — ignored in favour
// of the self-fetched data so recharts never runs during SSR.
interface Props {
  activity?: { date: string; count: number }[];
}

export function ActivityHeatmap(_props: Props) {
  const [mounted, setMounted] = useState(false);
  const [days, setDays] = useState<BarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Only runs in the browser — avoids SSR crash with recharts
  useEffect(() => {
    setMounted(true);
    fetch("/api/activity")
      .then((r) => r.json())
      .then((data: { date: string; count: number }[]) => {
        setDays(buildDays(Array.isArray(data) ? data : []));
      })
      .catch(() => {
        setDays(buildDays([]));
      })
      .finally(() => setLoading(false));
  }, []);

  // Don't render anything server-side
  if (!mounted) return <div style={{ height: 200 }} />;

  if (loading) {
    return (
      <div className="flex items-end gap-2 h-40 px-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-emerald-100 animate-pulse"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    );
  }

  const totalWeek = days.reduce((s, d) => s + d.count, 0);
  const todayCount = days[days.length - 1]?.count ?? 0;
  const maxCount = Math.max(...days.map((d) => d.count), 1);
  const yMax = maxCount + Math.ceil(maxCount * 0.3) + 1;

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Today</span>
          <span className="font-semibold text-emerald-600">{todayCount}</span>
        </div>
        <span className="text-muted-foreground/30">|</span>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">This week</span>
          <span className="font-semibold">{totalWeek}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={days}
            margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, yMax]}
              width={24}
            />
            <Tooltip content={<DayTooltip />} cursor={false} />
            <Bar
              dataKey="count"
              radius={[5, 5, 0, 0]}
              maxBarSize={52}
              onMouseEnter={(_: unknown, index: number) => setHoveredIndex(index)}
            >
              {days.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    hoveredIndex === i
                      ? "#10b981"   // emerald-500 on hover
                      : entry.isToday
                      ? "#34d399"   // emerald-400 for today
                      : "#bbf7d0"   // emerald-200 for other days
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[10px] text-muted-foreground text-right">Last 7 days</p>
    </div>
  );
}
