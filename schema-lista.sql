-- Lista de invitados con QR (una fila por persona inscrita por noche)
CREATE TABLE IF NOT EXISTS lista (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo    TEXT    NOT NULL UNIQUE,       -- lo que va dentro del QR
  nombre    TEXT    NOT NULL,
  telefono  TEXT    NOT NULL,
  personas  INTEGER NOT NULL DEFAULT 1,    -- cuántos vienen con ese QR (incluido él)
  fecha     TEXT    NOT NULL,              -- YYYY-MM-DD del sábado
  origen    TEXT,                          -- promotor o canal (?p=)
  estado    TEXT    NOT NULL DEFAULT 'inscrito',  -- inscrito | entro
  entro_en  TEXT,
  creado_en TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lista_fecha ON lista(fecha);
CREATE INDEX IF NOT EXISTS idx_lista_tel   ON lista(telefono);
