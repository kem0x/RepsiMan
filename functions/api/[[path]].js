const LEVEL_PATTERN = /^[1-4]-[1-3]$/;
const PLAYER_PATTERN = /^[a-f0-9-]{16,64}$/i;
const TOKEN_PATTERN = /^[a-f0-9-]{16,64}$/i;
const ROUTES = new Set(['campaign', 'practice']);
const RULESETS = new Set(['original', 'enhanced', 'assisted']);
const MAX_TICKS = 108000;
const RECOVERED_FLAG = 4;
const RECOVERY_START_MS = 1784874189000;
const RECOVERY_END_MS = Date.UTC(2026, 7, 7, 21, 0, 0);

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
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 16384)
    throw new RequestError('Request is too large.', 413);
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json'))
    throw new RequestError('Expected a JSON request.', 415);
  try {
    return await request.json();
  } catch (_) {
    throw new RequestError('Invalid JSON request.', 400);
  }
}

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
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
    `SELECT player_name AS name, ticks, flags
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
    entries: (rows.results || []).map(row => ({
      name: row.name,
      ticks: Number(row.ticks),
      recovered: (Number(row.flags) & RECOVERED_FLAG) !== 0
    })),
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
  if (!TOKEN_PATTERN.test(token) || !playerId || !name ||
      !Number.isInteger(ticks) || ticks < 60 || ticks > MAX_TICKS || !build ||
      (flags & ~3) !== 0)
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

function cleanRecoveryEntries(entries, now) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 36) return null;
  const recovered = new Map();
  for (const input of entries) {
    const board = cleanBoard(input);
    const ticks = Number(input?.ticks);
    const achievedAt = Number(input?.achievedAt);
    if (!board || !Number.isInteger(ticks) || ticks < 60 || ticks > MAX_TICKS ||
        !Number.isInteger(achievedAt) || achievedAt < RECOVERY_START_MS ||
        achievedAt > RECOVERY_END_MS || achievedAt > now + 5 * 60 * 1000)
      return null;
    const key = `${board.level}:${board.route}:${board.ruleset}`;
    const previous = recovered.get(key);
    if (!previous || ticks < previous.ticks)
      recovered.set(key, { ...board, ticks, achievedAt });
  }
  return [...recovered.values()];
}

async function recoverPersonalBests(request, db) {
  const now = Date.now();
  if (now > RECOVERY_END_MS)
    return json({ error: 'The recovery window has closed.' }, 410);
  const input = await readJson(request);
  const playerId = cleanPlayerId(input.playerId);
  const name = cleanName(input.name);
  const entries = cleanRecoveryEntries(input.entries, now);
  if (!playerId || !name || !entries)
    return json({ error: 'Invalid saved times.' }, 400);

  const recoveryId = crypto.randomUUID();
  const statements = [
    db.prepare(
      `INSERT INTO leaderboard_recoveries
         (player_id, recovery_id, player_name, recovered_at, entry_count)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(player_id) DO NOTHING`
    ).bind(playerId, recoveryId, name, now, entries.length),
    ...entries.map(entry => db.prepare(
      `INSERT INTO leaderboard_runs
         (player_id, player_name, level, route, ruleset, ticks, flags, build, achieved_at)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, 'repsiman-recovery-v1', ?8
         FROM leaderboard_recoveries
        WHERE player_id = ?1 AND recovery_id = ?9
       ON CONFLICT(level, route, ruleset, player_id) DO UPDATE SET
         player_name = excluded.player_name,
         ticks = excluded.ticks,
         flags = excluded.flags,
         build = excluded.build,
         achieved_at = excluded.achieved_at
       WHERE excluded.ticks < leaderboard_runs.ticks`
    ).bind(playerId, name, entry.level, entry.route, entry.ruleset, entry.ticks,
           RECOVERED_FLAG, entry.achievedAt, recoveryId))
  ];
  const results = await db.batch(statements);
  if (!Number(results[0]?.meta?.changes || 0))
    return json({ error: 'Saved times were already recovered for this player.' }, 409);
  return json({ ok: true, imported: entries.length }, 201);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.LEADERBOARD_DB)
    return json({ error: 'The online leaderboard is not configured yet.' }, 503);
  try {
    if (url.pathname === '/api/runs/start' && request.method === 'POST')
      return await startRun(request, env.LEADERBOARD_DB);
    if (url.pathname === '/api/runs' && request.method === 'POST')
      return await submitRun(request, env.LEADERBOARD_DB);
    if (url.pathname === '/api/leaderboard' && request.method === 'GET')
      return await getLeaderboard(request, env.LEADERBOARD_DB);
    if (url.pathname === '/api/recovery' && request.method === 'POST')
      return await recoverPersonalBests(request, env.LEADERBOARD_DB);
    return json({ error: 'Not found.' }, 404);
  } catch (error) {
    if (error instanceof RequestError)
      return json({ error: error.message }, error.status);
    console.error('leaderboard request failed', error);
    return json({ error: 'Leaderboard request failed.' }, 500);
  }
}
