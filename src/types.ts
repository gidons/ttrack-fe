export interface Song {
  id: string;
  title: string;
  arranger: string;
  key: string;
  durationSec: number;
  sheetMusicFile: string | null; // e.g. "sheet-music.pdf"
  partFiles: Record<string, string>; // e.g. { "Soprano": "soprano.wav", "Bass": "bass.wav" }
}