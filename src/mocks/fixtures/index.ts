import type { Club, FieldSchema, League, Player, PlayerMatch, Role, SystemUser } from "@/types/domain";

const NOW = new Date().toISOString();

export const leagues: League[] = [];

export const clubs: Club[] = [];

export const players: Player[] = [];

export const matches: PlayerMatch[] = [];

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
