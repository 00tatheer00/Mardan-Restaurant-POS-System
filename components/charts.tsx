"use client";

import { useTheme } from "next-themes";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatNum, formatPKR } from "@/lib/format";

// Validated categorical palette (fixed order; color follows the entity, never rank).
const SERIES = {
  light: ["#257de0", "#f47230", "#00b894", "#f2a600", "#ee7fac", "#008a17"],
  dark: ["#338ced", "#e76624", "#00a888", "#d28e05", "#e24d8b", "#0aac23"],
};

export function useChartTheme() {
  const dark = useTheme().resolvedTheme === "dark";
  return {
    series: dark ? SERIES.dark : SERIES.light,
    ink: dark ? "#9c9c9c" : "#6b7280",
    grid: dark ? "#2a2a2a" : "#ececec",
    surface: dark ? "#191919" : "#ffffff",
    tooltip: {
      contentStyle: { background: dark ? "#222" : "#fff", border: `1px solid ${dark ? "#333" : "#e5e5e5"}`, borderRadius: 12, fontSize: 12 },
      labelStyle: { color: dark ? "#efefef" : "#111", fontWeight: 600 },
      itemStyle: { color: dark ? "#efefef" : "#111" },
    },
  };
}

const axis = (ink: string) => ({ tick: { fill: ink, fontSize: 11 }, tickLine: false, axisLine: false });
const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(n));

export function TrendLine({ data, x, y, label }: { data: Record<string, unknown>[]; x: string; y: string; label: string }) {
  const t = useChartTheme();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={t.grid} />
        <XAxis dataKey={x} {...axis(t.ink)} minTickGap={24} />
        <YAxis {...axis(t.ink)} tickFormatter={compact} width={44} />
        <Tooltip {...t.tooltip} cursor={{ stroke: t.ink, strokeDasharray: "3 3" }} formatter={(v) => [formatPKR(Number(v)), label]} />
        <Line type="monotone" dataKey={y} stroke={t.series[1]} strokeWidth={2} dot={false} activeDot={{ r: 5, stroke: t.surface, strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({ data, x, y, label, horizontal, money = true, colorIndex = 0, height = 260 }: {
  data: Record<string, unknown>[]; x: string; y: string; label: string; horizontal?: boolean; money?: boolean; colorIndex?: number; height?: number;
}) {
  const t = useChartTheme();
  const fmt = (v: unknown) => (money ? formatPKR(Number(v)) : formatNum(Number(v)));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: horizontal ? 56 : 12, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid vertical={!!horizontal} horizontal={!horizontal} stroke={t.grid} />
        {horizontal ? (
          <>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey={x} {...axis(t.ink)} width={120} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...axis(t.ink)} />
            <YAxis {...axis(t.ink)} tickFormatter={compact} width={44} />
          </>
        )}
        <Tooltip {...t.tooltip} cursor={{ fill: t.grid }} formatter={(v) => [fmt(v), label]} />
        <Bar dataKey={y} fill={t.series[colorIndex]} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={28}>
          {horizontal && <LabelList dataKey={y} position="right" formatter={(v: unknown) => compact(Number(v))} style={{ fill: t.ink, fontSize: 11 }} />}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; value: number; slot: number }[] }) {
  const t = useChartTheme();
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <p className="py-16 text-center text-sm text-muted-foreground">No sales yet</p>;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip {...t.tooltip} formatter={(v, n) => [`${formatPKR(Number(v))} (${Math.round((Number(v) / total) * 100)}%)`, n]} />
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="100%" stroke={t.surface} strokeWidth={2}>
              {data.map((d) => <Cell key={d.name} fill={t.series[d.slot % t.series.length]} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: t.series[d.slot % t.series.length] }} />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-muted-foreground tabular-nums">{Math.round((d.value / total) * 100)}%</span>
            <span className="w-24 text-right font-medium tabular-nums">{formatPKR(d.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
