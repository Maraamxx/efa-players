// ─────────────────────────────────────────────
// Shared primitives
// ─────────────────────────────────────────────

export type Lang = "ar" | "en";

export interface BilingualString {
  ar: string;
  en: string;
}

// ─────────────────────────────────────────────
// Lookup tables
// ─────────────────────────────────────────────

export interface League {
  id: string;
  name: BilingualString;
  country: string; // ISO 3166-1 alpha-2
  season: string; // e.g. "2024/25"
  isActive: boolean;
}

export interface Club {
  id: string;
  name: BilingualString;
  leagueId: string;
  country: string;
  logoUrl: string | null;
  isActive: boolean;
}

// ─────────────────────────────────────────────
// Player
// ─────────────────────────────────────────────

export type Position =
  | "GK"
  | "CB" | "LB" | "RB" | "LWB" | "RWB"
  | "CDM" | "CM" | "CAM" | "LM" | "RM"
  | "LW" | "RW" | "CF" | "ST";
export type Foot = "left" | "right" | "both";
export type PlayerStatus = "active" | "inactive" | "suspended";

export interface PlayerNationality {
  countryCode: string; // ISO alpha-2 — used for flag display
  isPrimary: boolean;
  passportNumber: string | null;
}

export interface ClubHistoryEntry {
  clubId: string;
  clubName: string;
  from: string | null;
  to: string | null;
  isCurrent: boolean;
}

export interface Player {
  id: string;
  name: BilingualString;
  birthdate: string; // ISO date — "YYYY-MM-DD"
  ageGroup: number; // derived: new Date(birthdate).getFullYear()
  nationalities: PlayerNationality[];
  currentClubId: string | null;
  currentLeagueId: string | null;
  positions: Position[];
  preferredFoot: Foot;
  height: number; // cm
  idNumber: string; // masked in display: "29•••••••••••"
  passportNumber: string | null;
  photoUrl: string | null;
  fatherName: string;
  fatherPhone: string;
  fatherEmail: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  strengths: string[]; // free text tags — rendered green
  weaknesses: string[]; // free text tags — rendered red
  status: PlayerStatus;
  clubHistory: ClubHistoryEntry[];
  dynamicFieldValues: FieldValue[];
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────
// Matches
// ─────────────────────────────────────────────

export interface PlayerMatch {
  id: string;
  playerId: string;
  matchName: string;
  matchDate: string;
  competition: string | null;
  minutesPlayed: number;
  goalsScored: number;
  assists: number;
  notes: string | null;
  videos: MediaAsset[];
  createdAt: string;
  dynamicFieldValues?: { fieldSchemaId: string; value: any }[];
}

// ─────────────────────────────────────────────
// Analysis
// ─────────────────────────────────────────────

export interface PlayerAnalysis {
  playerId: string;
  // Appearances are admin-entered — a player can have multiple videos of the
  // same match, so match count is not a reliable count of appearances.
  totalAppearances: number;
  // Goals / assists / minutes are derived from PlayerMatch rows and may be
  // overridden by an admin via analysisStats.
  totalGoals: number;
  totalAssists: number;
  totalMinutes: number;
  dynamicFieldValues: FieldValue[];
  videos: MediaAsset[];
}

// ─────────────────────────────────────────────
// Dynamic fields
// ─────────────────────────────────────────────

export type FieldType =
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "select"
  | "multiselect"
  | "radio"
  | "file";

export type FieldTarget = "player" | "match" | "analysis";

export interface FieldSchema {
  id: string;
  label: BilingualString;
  fieldType: FieldType;
  entityTarget: FieldTarget;
  section: string;
  isRequired: boolean;
  sortOrder: number;
  options: BilingualString[] | null; // for select / radio / multiselect
  validationRules: {
    min?: number;
    max?: number;
    pattern?: string;
  } | null;
  createdAt: string;
}

export interface FieldValue {
  fieldSchemaId: string;
  value: string | number | boolean | string[] | null;
}

// ─────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────

export interface VideoNote {
  id: string;
  assetId: string;
  timestamp: number; // seconds
  text: string;
  authorName: string;
  createdAt: string;
}

export interface MediaAsset {
  id: string;
  entityType: "match" | "analysis";
  entityId: string;
  originalFilename: string;
  sizeBytes: number;
  durationSeconds: number | null;
  blobUrl: string | null; // blob: URL — lives for the browser session
  uploadedAt: string;
  notes: VideoNote[];
}

// ─────────────────────────────────────────────
// Access control
// ─────────────────────────────────────────────

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'upload'
export type PermissionResource =
  | 'players' | 'matches' | 'media' | 'fields'
  | 'clubs' | 'leagues' | 'users' | 'audit' | 'roles'

export interface Permission {
  resource: PermissionResource
  actions:  PermissionAction[]
}

export interface Role {
  id:          string
  name:        string
  description: string
  isSystem:    boolean
  permissions: Permission[]
  createdAt:   string
}

export interface SystemUser {
  id:        string
  nameEn:    string
  nameAr:    string
  email:     string
  password:  string
  roleId:    string
  isActive:  boolean
  createdAt: string
}

// ─────────────────────────────────────────────
// Audit
// ─────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export type AuditEntityType =
  | 'player' | 'match' | 'field_schema' | 'media' | 'video_note' | 'club' | 'league' | 'user' | 'role'

export interface AuditEntry {
  id: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  entityLabel: string
  userId: string
  userName: string
  diff: {
    before: Record<string, unknown> | null
    after:  Record<string, unknown> | null
    changed: string[]
  }
  timestamp: string
  ipAddress: string
}

// ─────────────────────────────────────────────
// API response wrappers
// ─────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiError {
  code: string;
  message: BilingualString;
  field?: string;
}
