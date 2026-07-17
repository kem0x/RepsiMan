const LEVEL_PATTERN = /^[1-4]-[1-3]$/;
const PLAYER_PATTERN = /^[a-f0-9-]{16,64}$/i;
const ROUTES = new Set(['campaign', 'practice']);
const RULESETS = new Set(['original', 'enhanced', 'assisted']);

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function cleanBoard(input = {}) {
  const level = String(input.level || '');
  const route = String(input.route || '');
  const ruleset = String(input.ruleset || '');
  if (!LEVEL_PATTERN.test(level) || !ROUTES.has(route) || !RULESETS.has(ruleset))
    return null;
  return { level, route, ruleset };
}

function cleanPlayerId(value) {
  const id = String(value || '');
  return PLAYER_PATTERN.test(id) ? id : null;
}

function cleanName(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '')
    .trim().replace(/\s+/g, ' ').slice(0, 20);
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json'))
    throw new Error('Expected a JSON request.');
  return request.json();
}

async function startRun(request, db) {
  const input = await readJson(request);
  const board = cleanBoard(input);
  const playerId = cleanPlayerId(input.playerId);
  if (!board || !playerId) return json({ error: 'Invalid run settings.' }, 400);

  const now = Date.now();
  const recent = await db.prepare(
    `SELECT COUNT(*) AS count FROM leaderboard_tokens
       WHERE player_id = ?1 AND issued_at >= ?2`
  ).bind(playerId, now - 60000).first();
  if (Number(recent?.count || 0) >= 12)
    return json({ error: 'Too many run starts. Wait a moment and retry.' }, 429);

  const token = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO leaderboard_tokens
       (token, player_id, level, route, ruleset, issued_at, expires_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(token, playerId, board.level, board.route, board.ruleset,
         now, now + 2 * 60 * 60 * 1000).run();
  return json({ token, expiresAt: now + 2 * 60 * 60 * 1000 }, 201);
}

async function boardPayload(db, board, playerId = null) {
  const rows = await db.prepare(
    `SELECT player_name AS name, ticks
       FROM leaderboard_runs
      WHERE level = ?1 AND route = ?2 AND ruleset = ?3
      ORDER BY ticks ASC, achieved_at ASC
      LIMIT 10`
  ).bind(board.level, board.route, board.ruleset).all();

  let playerRank = null;
  let playerBest = null;
  if (playerId) {
    const best = await db.prepare(
      `SELECT ticks FROM leaderboard_runs
        WHERE level = ?1 AND route = ?2 AND ruleset = ?3 AND player_id = ?4`
    ).bind(board.level, board.route, board.ruleset, playerId).first();
    if (best) {
      playerBest = Number(best.ticks);
      const rank = await db.prepare(
        `SELECT 1 + COUNT(*) AS rank FROM leaderboard_runs
          WHERE level = ?1 AND route = ?2 AND ruleset = ?3 AND ticks < ?4`
      ).bind(board.level, board.route, board.ruleset, playerBest).first();
      playerRank = Number(rank?.rank || 1);
    }
  }
  return {
    entries: (rows.results || []).map(row => ({ name: row.name, ticks: Number(row.ticks) })),
    playerRank,
    playerBest
  };
}

async function getLeaderboard(request, db) {
  const url = new URL(request.url);
  const board = cleanBoard(Object.fromEntries(url.searchParams));
  const rawPlayerId = url.searchParams.get('playerId');
  const playerId = rawPlayerId ? cleanPlayerId(rawPlayerId) : null;
  if (!board || (rawPlayerId && !playerId))
    return json({ error: 'Invalid leaderboard.' }, 400);
  return json(await boardPayload(db, board, playerId));
}

async function submitRun(request, db) {
  const input = await readJson(request);
  const token = String(input.token || '');
  const playerId = cleanPlayerId(input.playerId);
  const name = cleanName(input.name);
  const ticks = Number(input.ticks);
  const flags = Number(input.flags || 0) | 0;
  const build = String(input.build || '').replace(/[^a-z0-9._-]/gi, '').slice(0, 40);
  if (!/^[a-f0-9-]{16,64}$/i.test(token) || !playerId || !name ||
      !Number.isInteger(ticks) || ticks < 60 || ticks > 108000 || !build)
    return json({ error: 'Invalid result.' }, 400);
  if (flags & 1) return json({ error: 'Paused runs are not ranked.' }, 400);

  const issued = await db.prepare(
    `SELECT level, route, ruleset, expires_at, used_at
       FROM leaderboard_tokens
      WHERE token = ?1 AND player_id = ?2`
  ).bind(token, playerId).first();
  if (!issued || issued.used_at || Number(issued.expires_at) < Date.now())
    return json({ error: 'This run ticket expired or was already used.' }, 409);
  if ((flags & 2) !== 0 ? issued.ruleset !== 'assisted' : issued.ruleset === 'assisted')
    return json({ error: 'The run settings do not match this board.' }, 400);

  const now = Date.now();
  const statements = [
    db.prepare(
      `INSERT INTO leaderboard_submissions
         (token, player_id, player_name, level, route, ruleset, ticks, flags, build, submitted_at)
       SELECT token, player_id, ?3, level, route, ruleset, ?4, ?5, ?6, ?7
         FROM leaderboard_tokens
        WHERE token = ?1 AND player_id = ?2 AND used_at IS NULL AND expires_at >= ?7
       ON CONFLICT(token) DO NOTHING`
    ).bind(token, playerId, name, ticks, flags, build, now),
    db.prepare(
      `INSERT INTO leaderboard_runs
         (player_id, player_name, level, route, ruleset, ticks, flags, build, achieved_at)
       SELECT player_id, player_name, level, route, ruleset, ticks, flags, build, submitted_at
         FROM leaderboard_submissions
        WHERE token = ?1 AND player_id = ?2 AND ticks = ?3
       ON CONFLICT(level, route, ruleset, player_id) DO UPDATE SET
         player_name = excluded.player_name,
         ticks = excluded.ticks,
         flags = excluded.flags,
         build = excluded.build,
         achieved_at = excluded.achieved_at
       WHERE excluded.ticks < leaderboard_runs.ticks`
    ).bind(token, playerId, ticks),
    db.prepare(
      `UPDATE leaderboard_tokens SET used_at = ?2
        WHERE token = ?1 AND used_at IS NULL`
    ).bind(token, now)
  ];
  const results = await db.batch(statements);
  if (!Number(results[0]?.meta?.changes || 0))
    return json({ error: 'This run ticket was already consumed.' }, 409);

  const board = { level: issued.level, route: issued.route, ruleset: issued.ruleset };
  const payload = await boardPayload(db, board, playerId);
  return json({ ok: true, rank: payload.playerRank, bestTicks: payload.playerBest });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.LEADERBOARD_DB)
      return json({ error: 'The online leaderboard is not configured yet.' }, 503);
    try {
      if (url.pathname === '/api/runs/start' && request.method === 'POST')
        return await startRun(request, env.LEADERBOARD_DB);
      if (url.pathname === '/api/runs' && request.method === 'POST')
        return await submitRun(request, env.LEADERBOARD_DB);
      if (url.pathname === '/api/leaderboard' && request.method === 'GET')
        return await getLeaderboard(request, env.LEADERBOARD_DB);
      return json({ error: 'Not found.' }, 404);
    } catch (error) {
      console.error('leaderboard request failed', error);
      return json({ error: 'Leaderboard request failed.' }, 500);
    }
  }
};
