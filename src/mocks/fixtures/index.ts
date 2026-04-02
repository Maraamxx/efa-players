import type { Club, FieldSchema, League, Player, PlayerMatch, Role, SystemUser } from "@/types/domain";

const NOW = new Date().toISOString();

// ── Helper to generate league + club seed data ──────────────────────────────

function mkLeague(id: string, en: string, ar: string, country: string, season = '2025/26'): League {
  return { id, name: { en, ar }, country, season, isActive: true }
}

function mkClub(id: string, en: string, leagueId: string, country: string): Club {
  return { id, name: { en, ar: '-' }, leagueId, country, logoUrl: null, isActive: true }
}

let _ci = 0
const cid = () => `cl-${++_ci}`

export const leagues: League[] = [
  mkLeague('lg-it1', 'Serie A', 'الدوري الإيطالي', 'IT'),
  mkLeague('lg-it2', 'Serie B', 'الدوري الإيطالي ب', 'IT'),
  mkLeague('lg-en1', 'Premier League', 'الدوري الإنجليزي الممتاز', 'GB'),
  mkLeague('lg-en2', 'EFL Championship', 'دوري البطولة الإنجليزي', 'GB'),
  mkLeague('lg-es1', 'LALIGA EA SPORTS', 'الدوري الإسباني', 'ES'),
  mkLeague('lg-es2', 'LALIGA HYPERMOTION', 'الدوري الإسباني الدرجة الثانية', 'ES'),
  mkLeague('lg-de1', 'Bundesliga', 'الدوري الألماني', 'DE'),
  mkLeague('lg-fr1', 'Ligue 1', 'الدوري الفرنسي', 'FR'),
  mkLeague('lg-nl1', 'Eredivisie', 'الدوري الهولندي', 'NL'),
  mkLeague('lg-be1', 'Jupiler Pro League', 'الدوري البلجيكي', 'BE'),
  mkLeague('lg-sc1', 'Scottish Premiership', 'الدوري الاسكتلندي', 'GB'),
  mkLeague('lg-pt1', 'Liga Portugal Betclic', 'الدوري البرتغالي', 'PT'),
  mkLeague('lg-tr1', 'Süper Lig', 'الدوري التركي الممتاز', 'TR'),
  mkLeague('lg-gr1', 'Super League Greece', 'الدوري اليوناني', 'GR'),
  mkLeague('lg-at1', 'Admiral Bundesliga', 'الدوري النمساوي', 'AT'),
  mkLeague('lg-ch1', 'Swiss Super League', 'الدوري السويسري', 'CH'),
  mkLeague('lg-dk1', 'Superliga', 'الدوري الدنماركي', 'DK'),
  mkLeague('lg-no1', 'Eliteserien', 'الدوري النرويجي', 'NO'),
  mkLeague('lg-se1', 'Allsvenskan', 'الدوري السويدي', 'SE'),
  mkLeague('lg-cz1', 'Czech First League', 'الدوري التشيكي', 'CZ'),
  mkLeague('lg-pl1', 'Ekstraklasa', 'الدوري البولندي', 'PL'),
];

export const clubs: Club[] = [
  // ── Italy: Serie A ──
  ...['Atalanta','Bologna','Cagliari','Como','Fiorentina','Genoa','Hellas Verona','Inter','Juventus','Lazio','Lecce','Milan','Monza','Napoli','Parma','Roma','Torino','Udinese','Venezia','Empoli'].map(n => mkClub(cid(), n, 'lg-it1', 'IT')),
  // ── Italy: Serie B ──
  ...['Avellino','Bari','Carrarese','Catanzaro','Cesena','Cremonese','Frosinone','Juve Stabia','Mantova','Modena','Padova','Palermo','Pescara','Pisa','Reggiana','Sampdoria','Sassuolo','Spezia','Südtirol','Virtus Entella'].map(n => mkClub(cid(), n, 'lg-it2', 'IT')),
  // ── England: Premier League ──
  ...['Arsenal','Aston Villa','AFC Bournemouth','Brentford','Brighton & Hove Albion','Chelsea','Crystal Palace','Everton','Fulham','Ipswich Town','Liverpool','Manchester City','Manchester United','Newcastle United','Nottingham Forest','Southampton','Sunderland','Tottenham Hotspur','West Ham United','Wolverhampton Wanderers'].map(n => mkClub(cid(), n, 'lg-en1', 'GB')),
  // ── England: EFL Championship ──
  ...['Birmingham City','Blackburn Rovers','Bristol City','Burnley','Charlton Athletic','Coventry City','Derby County','Hull City','Leeds United','Leicester City','Middlesbrough','Millwall','Norwich City','Oxford United','Portsmouth','Preston North End','Queens Park Rangers','Sheffield United','Sheffield Wednesday','Stoke City','Swansea City','Watford','West Bromwich Albion','Wrexham'].map(n => mkClub(cid(), n, 'lg-en2', 'GB')),
  // ── Spain: LALIGA EA SPORTS ──
  ...['Athletic Club','Atlético de Madrid','CA Osasuna','Celta','Deportivo Alavés','FC Barcelona','Getafe CF','Girona FC','Rayo Vallecano','RCD Espanyol de Barcelona','RCD Mallorca','Real Betis','Real Madrid','Real Oviedo','Real Sociedad','Real Valladolid','Sevilla FC','Valencia CF','Villarreal CF','Leganés'].map(n => mkClub(cid(), n, 'lg-es1', 'ES')),
  // ── Spain: LALIGA HYPERMOTION ──
  ...['AD Ceuta FC','Albacete BP','Burgos CF','Cádiz CF','CD Castellón','CD Mirandés','Córdoba CF','Cultural y Deportiva Leonesa','Elche CF','FC Andorra','Granada CF','Levante UD','Málaga CF','Racing Club','Real Sociedad B','RC Deportivo','Real Sporting','Real Zaragoza','SD Eibar','SD Huesca','UD Almería','UD Las Palmas'].map(n => mkClub(cid(), n, 'lg-es2', 'ES')),
  // ── Germany: Bundesliga ──
  ...['Augsburg','Bayern Munich','Bayer Leverkusen','Borussia Dortmund','Borussia Mönchengladbach','Eintracht Frankfurt','Freiburg','Hamburg','Heidenheim','Hoffenheim','Mainz','RB Leipzig','St. Pauli','Union Berlin','VfB Stuttgart','Werder Bremen','Wolfsburg','Bochum'].map(n => mkClub(cid(), n, 'lg-de1', 'DE')),
  // ── France: Ligue 1 ──
  ...['SCO Angers','AJ Auxerre','AS Monaco','Stade Brestois','FC Nantes','Havre AC','LOSC','OGC Nice','Olympique Lyonnais','Olympique de Marseille','Paris FC','Paris Saint-Germain','RC Lens','Rennes','RC Strasbourg','Toulouse FC','Saint-Étienne','Montpellier'].map(n => mkClub(cid(), n, 'lg-fr1', 'FR')),
  // ── Netherlands: Eredivisie ──
  ...['Ajax','AZ','FC Groningen','FC Twente','FC Utrecht','Feyenoord','Fortuna Sittard','Go Ahead Eagles','Heracles Almelo','N.E.C. Nijmegen','NAC Breda','PEC Zwolle','PSV','sc Heerenveen','Sparta Rotterdam','RKC Waalwijk','Willem II','Almere City'].map(n => mkClub(cid(), n, 'lg-nl1', 'NL')),
  // ── Belgium: Jupiler Pro League ──
  ...['RSC Anderlecht','Royal Antwerp FC','Club Brugge','Cercle Brugge','KRC Genk','KAA Gent','Union SG','Standard de Liège','OH Leuven','STVV','KVC Westerlo','Sporting Charleroi','KV Mechelen','FCV Dender EH','Beerschot','Westerlo'].map(n => mkClub(cid(), n, 'lg-be1', 'BE')),
  // ── Scotland: Scottish Premiership ──
  ...['Aberdeen','Celtic','Dundee','Dundee United','Falkirk','Heart of Midlothian','Hibernian','Kilmarnock','Livingston','Motherwell','Rangers','St. Mirren'].map(n => mkClub(cid(), n, 'lg-sc1', 'GB')),
  // ── Portugal: Liga Portugal Betclic ──
  ...['Casa Pia AC','CD Nacional','Estoril Praia','Estrela Amadora','FC Arouca','FC Famalicão','FC Porto','Gil Vicente FC','Moreirense FC','Rio Ave FC','Santa Clara','SC Braga','SL Benfica','Sporting CP','Vitória SC','AVS','FC Vizela','Boavista'].map(n => mkClub(cid(), n, 'lg-pt1', 'PT')),
  // ── Türkiye: Süper Lig ──
  ...['Galatasaray','Fenerbahçe','Beşiktaş','Trabzonspor','Başakşehir','Göztepe','Gaziantep FK','Kasımpaşa','Eyüpspor','Samsunspor','Kocaelispor','Çaykur Rizespor','Alanyaspor','Antalyaspor','Konyaspor','Kayserispor','Sivasspor','Fatih Karagümrük','Bodrum FK'].map(n => mkClub(cid(), n, 'lg-tr1', 'TR')),
  // ── Greece: Super League ──
  ...['AEK','AEL','Aris','Asteras Tripolis','Atromitos','Volos NFC','Kifisia','Levadiakos','Olympiacos','OFI','Panathinaikos','Panetolikos','Panserraikos','PAOK','Ionikos','Lamia'].map(n => mkClub(cid(), n, 'lg-gr1', 'GR')),
  // ── Austria: Admiral Bundesliga ──
  ...['SK Sturm Graz','FC Red Bull Salzburg','FK Austria Wien','Wolfsberger AC','SK Rapid','FC Blau-Weiß Linz','LASK','TSV Hartberg','WSG Tirol','Grazer AK','SCR Altach','SV Ried'].map(n => mkClub(cid(), n, 'lg-at1', 'AT')),
  // ── Switzerland: Super League ──
  ...['FC Basel 1893','Grasshopper Club Zürich','FC Lausanne-Sport','FC Lugano','FC Luzern','Servette FC','FC Sion','FC St. Gallen 1879','FC Thun','FC Winterthur','BSC Young Boys','FC Zürich'].map(n => mkClub(cid(), n, 'lg-ch1', 'CH')),
  // ── Denmark: Superliga ──
  ...['AGF','Brøndby IF','F.C. København','FC Fredericia','FC Midtjylland','FC Nordsjælland','OB','Randers FC','Silkeborg IF','Sønderjyske Fodbold','Vejle Boldklub','Viborg FF','Lyngby BK','AaB'].map(n => mkClub(cid(), n, 'lg-dk1', 'DK')),
  // ── Norway: Eliteserien ──
  ...['Vålerenga','Viking','Kristiansund','Bodø/Glimt','Sarpsborg 08','Start','Molde','Lillestrøm','HamKam','Brann','Tromsø','Rosenborg','KFUM','Sandefjord','Aalesund','Fredrikstad'].map(n => mkClub(cid(), n, 'lg-no1', 'NO')),
  // ── Sweden: Allsvenskan ──
  ...['AIK','BK Häcken','Degerfors IF','Djurgården','GAIS','Halmstads BK','Hammarby','IF Brommapojkarna','IF Elfsborg','IFK Göteborg','IK Sirius','Kalmar FF','Malmö FF','Mjällby AIF','Västerås SK','Örgryte IS'].map(n => mkClub(cid(), n, 'lg-se1', 'SE')),
  // ── Czechia: Czech First League ──
  ...['AC Sparta Prague','SK Slavia Prague','FC Viktoria Plzeň','FC Baník Ostrava','FK Mladá Boleslav','SK Sigma Olomouc','FC Slovácko','FK Teplice','FK Jablonec','SFC Opava','FK Pardubice','SK Dynamo České Budějovice','1. FK Příbram','MFK Karviná','FC Zbrojovka Brno','FC Vysočina Jihlava'].map(n => mkClub(cid(), n, 'lg-cz1', 'CZ')),
  // ── Poland: Ekstraklasa ──
  ...['Legia Warsaw','Lech Poznań','Raków Częstochowa','Wisła Kraków','Śląsk Wrocław','Zagłębie Lubin','Cracovia','Jagiellonia Białystok','Pogoń Szczecin','Widzew Łódź','Górnik Zabrze','Piast Gliwice','Motor Lublin','Korona Kielce','Stal Mielec','GKS Katowice','Puszcza Niepołomice','Lechia Gdańsk'].map(n => mkClub(cid(), n, 'lg-pl1', 'PL')),
];

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
