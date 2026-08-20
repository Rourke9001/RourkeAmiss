export function percentChange(from: number, to: number): number {
  if (from === 0) throw new Error('percentChange: baseline cannot be zero');
  return Math.round(((to - from) / from) * 100);
}

export function barFraction(from: number, to: number): number {
  if (from <= 0) return 0;
  return Math.min(1, Math.max(0, to / from));
}

export function formatFigure(value: number, unit: string): string {
  return `${value.toLocaleString('en-GB')}${unit}`;
}

export function formatDelta(from: number, to: number): string {
  const pct = percentChange(from, to);
  return pct < 0 ? `−${Math.abs(pct)}%` : `+${pct}%`;
}
