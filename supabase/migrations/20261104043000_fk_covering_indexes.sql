-- Add covering indexes for foreign keys that do not already have one.
-- This is intentionally metadata-driven so future tables benefit as well.
DO $$
DECLARE fk record; cols text; idx text;
BEGIN
  FOR fk IN
    SELECT n.nspname AS schema_name, c.relname AS table_name, con.conname,
      string_agg(format('%I', a.attname), ', ' ORDER BY k.ord) AS columns
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
    WHERE con.contype = 'f' AND n.nspname IN ('public','private')
    GROUP BY n.nspname, c.relname, con.conname
  LOOP
    idx := left(format('idx_fk_%s_%s_%s', fk.schema_name, fk.table_name, substr(md5(fk.conname),1,8)), 63);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I.%I (%s)', idx, fk.schema_name, fk.table_name, fk.columns);
  END LOOP;
END $$;

