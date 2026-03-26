import type { Club, FieldSchema, League, Player, PlayerMatch, Position, PlayerStatus, Role, SystemUser } from "@/types/domain";

const NOW = new Date().toISOString();

const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const statuses: PlayerStatus[] = ["active", "active", "active", "inactive", "suspended"];
const feet = ["left", "right", "both"] as const;

const FIRST_NAMES_EN = ["Mohamed", "Ahmed", "Omar", "Youssef", "Ali", "Karim", "Ibrahim", "Hossam"];
const LAST_NAMES_EN = ["Abdallah", "Hassan", "Mahmoud", "Fathi", "Ashraf", "Sayed", "Gaber", "Nabil"];
const FIRST_NAMES_AR = ["محمد", "أحمد", "عمر", "يوسف", "علي", "كريم", "إبراهيم", "حسام"];
const LAST_NAMES_AR = ["عبدالله", "حسن", "محمود", "فتحي", "أشرف", "السيد", "جابر", "نبيل"];

const COMPETITIONS = ["Egyptian Premier League", "Egypt Cup", "CAF Champions League", null, "CAF Confederation Cup", null];
const MATCH_NAMES = [
  "Al Ahly vs Zamalek",
  "Egypt U20 vs Morocco U20",
  "CAF Champions League QF",
  "Egypt Cup Round of 16",
  "Pyramids FC vs Smouha",
  "CAF Confederation Cup SF",
  "Egyptian Premier League Derby",
  "Al Masry vs ENPPI",
];

const toDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

export const leagues: League[] = [
  {
    id: "lg-1",
    name: { ar: "الدوري المصري الممتاز", en: "Egyptian Premier League" },
    country: "EG",
    season: "2025/26",
    isActive: true,
  },
  {
    id: "lg-2",
    name: { ar: "دوري المحترفين", en: "Professional League" },
    country: "EG",
    season: "2025/26",
    isActive: true,
  },
];

export const clubs: Club[] = [
  {
    id: "cl-1",
    name: { ar: "الأهلي", en: "Al Ahly" },
    leagueId: "lg-1",
    country: "EG",
    logoUrl: null,
    isActive: true,
  },
  {
    id: "cl-2",
    name: { ar: "الزمالك", en: "Zamalek" },
    leagueId: "lg-1",
    country: "EG",
    logoUrl: null,
    isActive: true,
  },
  {
    id: "cl-3",
    name: { ar: "بيراميدز", en: "Pyramids FC" },
    leagueId: "lg-1",
    country: "EG",
    logoUrl: null,
    isActive: true,
  },
  {
    id: "cl-4",
    name: { ar: "إنبي", en: "ENPPI" },
    leagueId: "lg-2",
    country: "EG",
    logoUrl: null,
    isActive: true,
  },
];

export const players: Player[] = Array.from({ length: 40 }, (_, i) => {
  const index = i + 1;
  const club = clubs[i % clubs.length];
  const first = i % FIRST_NAMES_EN.length;
  const last = (i + 3) % LAST_NAMES_EN.length;
  const birthYear = 2003 + (i % 8);
  const position = positions[i % positions.length];
  const status = statuses[i % statuses.length];

  return {
    id: `player-${index}`,
    name: {
      en: `${FIRST_NAMES_EN[first]} ${LAST_NAMES_EN[last]}`,
      ar: `${FIRST_NAMES_AR[first]} ${LAST_NAMES_AR[last]}`,
    },
    birthdate: toDate(birthYear, ((i % 12) + 1), ((i % 27) + 1)),
    ageGroup: birthYear,
    nationalities: [
      {
        countryCode: "EG",
        isPrimary: true,
        passportNumber: `P${String(index).padStart(7, "0")}`,
      },
      ...(i % 5 === 0
        ? [
            {
              countryCode: "MA",
              isPrimary: false,
              passportNumber: null,
            },
          ]
        : []),
    ],
    currentClubId: club.id,
    currentLeagueId: club.leagueId,
    position,

    preferredFoot: feet[i % feet.length],
    height: 168 + (i % 24),
    idNumber: `29800000000${String(index).padStart(2, "0")}`,
    passportNumber: i % 3 === 0 ? `A${String(index).padStart(8, "0")}` : null,
    photoUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${index}`,
    contractStart: toDate(2024, (i % 12) + 1, 1),
    contractEnd:   i % 4 === 0 ? null : toDate(2026 + (i % 3), (i % 12) + 1, 1),
    fatherName: `${FIRST_NAMES_AR[(i + 2) % FIRST_NAMES_AR.length]} ${LAST_NAMES_AR[(i + 1) % LAST_NAMES_AR.length]}`,
    fatherPhone: `+2010${String(1000000 + index).padStart(7, "0")}`,
    fatherEmail: i % 4 === 0 ? `guardian${index}@efa.local` : null,
    strengths: [position === "MID" ? "Passing" : "Positioning", "Discipline"],
    weaknesses: [position === "GK" ? "Distribution" : "Aerial duels"],
    status,
    clubHistory: [],
    dynamicFieldValues: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
});

export const matches: PlayerMatch[] = players.flatMap((player, pIndex) =>
  Array.from({ length: 6 }, (_, mIndex) => ({
    id: `match-${player.id}-${mIndex + 1}`,
    playerId: player.id,
    matchName: MATCH_NAMES[(pIndex + mIndex) % MATCH_NAMES.length],
    matchDate: toDate(2025, ((mIndex + pIndex) % 12) + 1, ((mIndex * 4 + pIndex) % 27) + 1),
    competition: COMPETITIONS[(pIndex + mIndex) % COMPETITIONS.length] as string | null,
    minutesPlayed: 45 + ((mIndex * 9 + pIndex) % 51),
    goalsScored: (pIndex + mIndex) % 3 === 0 ? 1 : 0,
    assists: (pIndex + mIndex) % 4 === 0 ? 1 : 0,
    notes: mIndex % 3 === 0 ? "Solid overall performance." : null,
    videos: [],
    createdAt: NOW,
    dynamicFieldValues: [],
  })),
);

export const roles: Role[] = [
  {
    id: 'role-admin',
    name: 'Super Admin',
    description: 'Full access to everything',
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    permissions: [
      { resource: 'players',  actions: ['view','create','edit','delete'] },
      { resource: 'matches',  actions: ['view','create','edit','delete'] },
      { resource: 'media',    actions: ['view','upload','delete'] },
      { resource: 'fields',   actions: ['view','create','edit','delete'] },
      { resource: 'clubs',    actions: ['view','create','edit','delete'] },
      { resource: 'leagues',  actions: ['view','create','edit','delete'] },
      { resource: 'users',    actions: ['view','create','edit','delete'] },
      { resource: 'audit',    actions: ['view'] },
      { resource: 'roles',    actions: ['view','create','edit','delete'] },
    ],
  },
  {
    id: 'role-scout',
    name: 'Scout',
    description: 'Can view and add players, log matches, upload media',
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    permissions: [
      { resource: 'players', actions: ['view','create'] },
      { resource: 'matches', actions: ['view','create'] },
      { resource: 'media',   actions: ['view','upload'] },
      { resource: 'clubs',   actions: ['view'] },
      { resource: 'leagues', actions: ['view'] },
    ],
  },
  {
    id: 'role-analyst',
    name: 'Analyst',
    description: 'View-only access to players and analysis',
    isSystem: true,
    createdAt: '2024-01-01T00:00:00Z',
    permissions: [
      { resource: 'players', actions: ['view'] },
      { resource: 'matches', actions: ['view'] },
      { resource: 'media',   actions: ['view'] },
      { resource: 'clubs',   actions: ['view'] },
      { resource: 'leagues', actions: ['view'] },
    ],
  },
]

export const systemUsers: SystemUser[] = [
  {
    id: 'user-1', nameEn: 'System Admin', nameAr: 'مدير النظام',
    email: 'admin@efa.eg', password: 'admin123',
    roleId: 'role-admin', isActive: true, createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2', nameEn: 'Ahmed Scout', nameAr: 'أحمد الكشاف',
    email: 'scout@efa.eg', password: 'scout123',
    roleId: 'role-scout', isActive: true, createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-3', nameEn: 'Omar Analyst', nameAr: 'عمر المحلل',
    email: 'analyst@efa.eg', password: 'analyst123',
    roleId: 'role-analyst', isActive: true, createdAt: '2024-01-01T00:00:00Z',
  },
]

export const fieldSchemas: FieldSchema[] = [
  {
    id: "fs-1",
    label: { ar: "الوزن", en: "Weight (kg)" },
    fieldType: "number",
    entityTarget: "player",
    section: "additional",
    isRequired: false,
    sortOrder: 1,
    options: null,
    validationRules: { min: 40, max: 130 },
    createdAt: NOW,
  },
  {
    id: "fs-2",
    label: { ar: "مستوى اللياقة", en: "Fitness Level" },
    fieldType: "radio",
    entityTarget: "player",
    section: "additional",
    isRequired: false,
    sortOrder: 2,
    options: [
      { ar: "ممتاز", en: "Excellent" },
      { ar: "جيد", en: "Good" },
      { ar: "متوسط", en: "Average" },
    ],
    validationRules: null,
    createdAt: NOW,
  },
  {
    id: "fs-3",
    label: { ar: "تاريخ آخر فحص", en: "Last Medical Check" },
    fieldType: "date",
    entityTarget: "player",
    section: "additional",
    isRequired: false,
    sortOrder: 3,
    options: null,
    validationRules: null,
    createdAt: NOW,
  },
  {
    id: "fs-4",
    label: { ar: "ملاحظات الكشاف", en: "Scout Notes" },
    fieldType: "text",
    entityTarget: "analysis",
    section: "analysis",
    isRequired: false,
    sortOrder: 1,
    options: null,
    validationRules: null,
    createdAt: NOW,
  },
  {
    id: "fs-5",
    label: { ar: "التقييم العام", en: "Overall Rating" },
    fieldType: "number",
    entityTarget: "analysis",
    section: "analysis",
    isRequired: false,
    sortOrder: 2,
    options: null,
    validationRules: { min: 1, max: 10 },
    createdAt: NOW,
  },
];
