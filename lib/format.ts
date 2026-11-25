import { formatInTimeZone } from "date-fns-tz";

export const TZ = "Asia/Karachi";

export const formatPKR = (n: number | string | null | undefined) =>
  "Rs. " + Math.round(Number(n ?? 0)).toLocaleString("en-PK");

export const formatNum = (n: number | string | null | undefined) => Math.round(Number(n ?? 0)).toLocaleString("en-PK");

export const formatDate = (d: Date | string | number, fmt = "dd-MMM-yyyy") => formatInTimeZone(d, TZ, fmt);

export const todayStr = () => formatDate(new Date(), "yyyy-MM-dd");
export const shiftDay = (d: string, days: number) => {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
};
export const monthStart = (d = todayStr()) => `${d.slice(0, 7)}-01`;
export const inRange = (d: string | null | undefined, from: string, to: string) => !!d && d >= from && d <= to;
export const formatQty = (n: number | string | null | undefined) => Number(n ?? 0).toLocaleString("en-PK", { maximumFractionDigits: 3 });
