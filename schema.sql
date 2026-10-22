-- Esquema de la base de datos de reservas (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS reservas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre    TEXT    NOT NULL,
  telefono  TEXT    NOT NULL,
  zona      TEXT    NOT NULL DEFAULT 'General',
  personas  INTEGER NOT NULL DEFAULT 1,
  fecha     TEXT,                    -- YYYY-MM-DD
  hora      TEXT,                    -- HH:MM
  notas     TEXT,
  estado    TEXT    NOT NULL DEFAULT 'pendiente',  -- pendiente | confirmada | cancelada | llego
  creado_en TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha  ON reservas(fecha);
