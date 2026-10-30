CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,                 -- 'r2' | 'youtube' | 'instagram'
  titulo TEXT,
  video_key TEXT,                     -- clave en R2 (solo tipo r2)
  url TEXT,                           -- URL de incrustar (youtube/instagram)
  tamano INTEGER NOT NULL DEFAULT 0,  -- bytes (solo r2, para estadística)
  orden INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'publicado',
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_estado ON videos(estado, orden);
