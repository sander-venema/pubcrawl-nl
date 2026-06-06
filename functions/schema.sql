-- D1 schema for the Cloudflare Pages Guinness backend.
-- Optional: the Function also creates this lazily (CREATE TABLE IF NOT EXISTS),
-- but you can apply it up-front with:
--   npx wrangler d1 execute pubcrawl-guinness --remote --file=functions/schema.sql
CREATE TABLE IF NOT EXISTS votes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    osm_id      TEXT NOT NULL,
    serves      INTEGER NOT NULL,
    client_hash TEXT NOT NULL,
    ip_hash     TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    flagged     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_votes_osm ON votes(osm_id);
