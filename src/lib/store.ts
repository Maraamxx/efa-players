import {
  players as seedPlayers,
  matches as seedMatches,
  fieldSchemas as seedSchemas,
  clubs as seedClubs,
  leagues as seedLeagues,
  roles as seedRoles,
  systemUsers as seedUsers,
} from "@/mocks/fixtures";
import type {
  Player,
  PlayerMatch,
  FieldSchema,
  Club,
  League,
  MediaAsset,
  Role,
  SystemUser,
} from "@/types/domain";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STORE_VERSION = 11;
const PERSIST_PATH = join(
  process.env.NODE_ENV === "production" ? "/tmp" : join(process.cwd(), ".next"),
  "efa-store.json"
);

interface StoreData {
  version: number;
  players: Player[];
  matches: PlayerMatch[];
  schemas: FieldSchema[];
  clubs: Club[];
  leagues: League[];
  auditLog: any[];
  media: MediaAsset[];
  roles: Role[];
  users: SystemUser[];
}

function loadFromDisk(): StoreData | null {
  try {
    if (existsSync(PERSIST_PATH)) {
      const raw = readFileSync(PERSIST_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (data.version === STORE_VERSION) return data;
    }
  } catch {}
  return null;
}

function saveToDisk(data: StoreData) {
  try {
    writeFileSync(PERSIST_PATH, JSON.stringify(data));
  } catch {}
}

function seed(): StoreData {
  return {
    version: STORE_VERSION,
    players: [...seedPlayers],
    matches: [...seedMatches],
    schemas: [...seedSchemas],
    clubs: [...seedClubs],
    leagues: [...seedLeagues],
    auditLog: [],
    media: [],
    roles: [...seedRoles],
    users: [...seedUsers],
  };
}

// Try disk first, then globalThis, then seed fresh
declare global {
  var __efa_store: StoreData | undefined;
}

if (!globalThis.__efa_store || globalThis.__efa_store.version !== STORE_VERSION) {
  globalThis.__efa_store = loadFromDisk() ?? seed();
}

export const store = globalThis.__efa_store;

export function persistStore() {
  saveToDisk(store);
}
