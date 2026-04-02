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

const STORE_VERSION = 9;
// Stored on globalThis so it survives Next.js hot module reloads in dev
// In production this lives for the lifetime of the server process


declare global {
  var __efa_store:
    | {
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
    | undefined;
}

if (
  !globalThis.__efa_store ||
  globalThis.__efa_store.version !== STORE_VERSION
) {
  globalThis.__efa_store = {
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
  console.log(
    '[store] seeded. schema sections:',
    globalThis.__efa_store!.schemas.map(s => `${s.id}:${s.section}`)
  );
}

export const store = globalThis.__efa_store;
