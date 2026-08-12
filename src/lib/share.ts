import LZString from "lz-string";
import type { Board } from "../types";

// Sharing with no backend: the whole board is compressed into the share URL, so a
// link reconstructs the board in any browser. Large boards fall back to JSON export.

export function encodeBoard(board: Board): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(board));
}

export function decodeBoard(param: string): Board | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(param);
    if (!json) return null;
    const b = JSON.parse(json) as Board;
    return b && b.id && Array.isArray(b.candidates) ? b : null;
  } catch {
    return null;
  }
}

export function buildShareUrl(board: Board): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/c/${board.slug}?d=${encodeBoard(board)}`;
}

export function exportBoardJson(board: Board) {
  const blob = new Blob([JSON.stringify(board, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `decisionlens-${board.slug}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBoardJson(file: File): Promise<Board> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      try {
        const b = JSON.parse(String(r.result)) as Board;
        if (!b.id || !Array.isArray(b.candidates)) throw new Error("Not a DecisionLens board file.");
        resolve(b);
      } catch (e) {
        reject(e);
      }
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}
