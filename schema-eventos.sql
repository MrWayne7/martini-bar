CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  fecha TEXT,
  descripcion TEXT,
  flyer_key TEXT,
  estado TEXT NOT NULL DEFAULT 'proximo',
  link TEXT,
  orden INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL DEFAULT (datetime('now'))
);
