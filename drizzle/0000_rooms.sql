CREATE TABLE pool_rooms (code TEXT PRIMARY KEY, rev INTEGER NOT NULL, state TEXT NOT NULL, expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX pool_expiry ON pool_rooms(expires);
