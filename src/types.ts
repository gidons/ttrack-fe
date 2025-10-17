export interface Song {
  id: string;
  title: string;
  arranger?: string;
  key?: string;
  durationSec?: number;
}

export function secondsToHMS(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const hDisplay = h > 0 ? h + ":" : "";
  const mDisplay = m > 0 ? m + ":" : "";
  const sDisplay = s.toString().padStart(2, '0');
  return (hDisplay + mDisplay + sDisplay).trim();
}

