import { http, HttpResponse } from "msw";
import { players, matches, fieldSchemas, clubs, leagues } from "../fixtures";

const BASE = "/api";

// mutable in-memory store so adds/edits persist during the session
let _players = [...players];
let _matches = [...matches];
let _schemas = [...fieldSchemas];

export const playerHandlers = [
  // GET /api/players?page=1&pageSize=20&search=&position=&status=&clubId=
  http.get(`${BASE}/players`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("pageSize") ?? 20);
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const position = url.searchParams.get("position") ?? "";
    const status = url.searchParams.get("status") ?? "";
    const clubId = url.searchParams.get("clubId") ?? "";

    let filtered = _players.filter((p) => {
      if (
        search &&
        !p.name.en.toLowerCase().includes(search) &&
        !p.name.ar.includes(search)
      )
        return false;
      if (position && p.position !== position) return false;
      if (status && p.status !== status) return false;
      if (clubId && p.currentClubId !== clubId) return false;
      return true;
    });

    const total = filtered.length;
    const data = filtered.slice((page - 1) * pageSize, page * pageSize);
    return HttpResponse.json({ data, total, page, pageSize });
  }),

  // GET /api/players/:id
  http.get(`${BASE}/players/:id`, ({ params }) => {
    const p = _players.find((p) => p.id === params.id);
    if (!p) return HttpResponse.json({ message: "Not found" }, { status: 404 });
    return HttpResponse.json(p);
  }),

  // POST /api/players
  http.post(`${BASE}/players`, async ({ request }) => {
    const body = (await request.json()) as any;
    const newPlayer = {
      ...body,
      id: `player-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    _players = [newPlayer, ..._players];
    return HttpResponse.json(newPlayer, { status: 201 });
  }),

  // PATCH /api/players/:id
  http.patch(`${BASE}/players/:id`, async ({ params, request }) => {
    const body = (await request.json()) as any;
    _players = _players.map((p) =>
      p.id === params.id
        ? { ...p, ...body, updatedAt: new Date().toISOString() }
        : p,
    );
    return HttpResponse.json(_players.find((p) => p.id === params.id));
  }),

  // DELETE /api/players/:id
  http.delete(`${BASE}/players/:id`, ({ params }) => {
    _players = _players.filter((p) => p.id !== params.id);
    return HttpResponse.json({ success: true });
  }),

  // GET /api/players/:id/matches
  http.get(`${BASE}/players/:id/matches`, ({ params }) => {
    const data = _matches
      .filter((m) => m.playerId === params.id)
      .sort((a, b) => b.matchDate.localeCompare(a.matchDate));
    return HttpResponse.json({
      data,
      total: data.length,
      page: 1,
      pageSize: data.length,
    });
  }),

  // POST /api/players/:id/matches
  http.post(`${BASE}/players/:id/matches`, async ({ params, request }) => {
    const body = (await request.json()) as any;
    const newMatch = {
      ...body,
      id: `match-${Date.now()}`,
      playerId: params.id,
      videos: [],
      createdAt: new Date().toISOString(),
    };
    _matches = [newMatch, ..._matches];
    return HttpResponse.json(newMatch, { status: 201 });
  }),

  // GET /api/players/:id/analysis
  http.get(`${BASE}/players/:id/analysis`, ({ params }) => {
    const playerMatches = _matches.filter((m) => m.playerId === params.id);
    return HttpResponse.json({
      playerId: params.id,
      totalAppearances: playerMatches.length,
      totalGoals: playerMatches.reduce((s, m) => s + m.goalsScored, 0),
      totalAssists: playerMatches.reduce((s, m) => s + m.assists, 0),
      totalMinutes: playerMatches.reduce((s, m) => s + m.minutesPlayed, 0),
      dynamicFieldValues: [],
      videos: [],
    });
  }),

  // GET /api/clubs + GET /api/leagues
  http.get(`${BASE}/clubs`, () => HttpResponse.json(clubs)),
  http.get(`${BASE}/leagues`, () => HttpResponse.json(leagues)),

// GET /api/field-schemas?target=player|match|analysis
http.get(`${BASE}/field-schemas`, ({ request }) => {
  const target = new URL(request.url).searchParams.get('target')
  const data = target ? _schemas.filter(s => s.entityTarget === target) : _schemas
  return HttpResponse.json(data.sort((a, b) => a.sortOrder - b.sortOrder))
}),

// POST /api/field-schemas
http.post(`${BASE}/field-schemas`, async ({ request }) => {
  const body = await request.json() as any
  const schema = {
    ...body,
    id: `fs-${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  _schemas = [..._schemas, schema]
  return HttpResponse.json(schema, { status: 201 })
}),

// PATCH /api/field-schemas/:id
http.patch(`${BASE}/field-schemas/:id`, async ({ params, request }) => {
  const body = await request.json() as any
  _schemas = _schemas.map(s => s.id === params.id ? { ...s, ...body } : s)
  return HttpResponse.json(_schemas.find(s => s.id === params.id))
}),

// DELETE /api/field-schemas/:id
http.delete(`${BASE}/field-schemas/:id`, ({ params }) => {
  _schemas = _schemas.filter(s => s.id !== params.id)
  return HttpResponse.json({ success: true })
}),

// PATCH /api/field-schemas/reorder — update sortOrder in bulk
http.post(`${BASE}/field-schemas/reorder`, async ({ request }) => {
  const { ids } = await request.json() as { ids: string[] }
  ids.forEach((id, index) => {
    _schemas = _schemas.map(s => s.id === id ? { ...s, sortOrder: index } : s)
  })
  return HttpResponse.json({ success: true })
})
];