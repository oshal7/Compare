import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Board } from "../types";

// Client-side persistence. No server: boards live in the browser's IndexedDB.

interface DLDB extends DBSchema {
  boards: {
    key: string;
    value: Board;
    indexes: { slug: string; updatedAt: number };
  };
}

let dbp: Promise<IDBPDatabase<DLDB>> | null = null;

function db() {
  if (!dbp) {
    dbp = openDB<DLDB>("decisionlens", 1, {
      upgrade(d) {
        const store = d.createObjectStore("boards", { keyPath: "id" });
        store.createIndex("slug", "slug", { unique: true });
        store.createIndex("updatedAt", "updatedAt");
      },
    });
  }
  return dbp;
}

export async function saveBoard(board: Board): Promise<void> {
  await (await db()).put("boards", board);
}

export async function getBoard(id: string): Promise<Board | undefined> {
  return (await db()).get("boards", id);
}

export async function getBoardBySlug(slug: string): Promise<Board | undefined> {
  return (await db()).getFromIndex("boards", "slug", slug);
}

export async function listBoards(): Promise<Board[]> {
  const all = await (await db()).getAllFromIndex("boards", "updatedAt");
  return all.reverse(); // newest first
}

export async function deleteBoard(id: string): Promise<void> {
  await (await db()).delete("boards", id);
}
