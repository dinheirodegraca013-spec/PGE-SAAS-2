-- Remove only indexes created by the FK hardening migration when an equivalent
-- pre-existing index already covers the same table columns.
DO $$
DECLARE current_index record;
BEGIN
  FOR current_index IN
    SELECT ns.nspname AS schema_name, cls.relname AS index_name, ix.indrelid, ix.indkey
    FROM pg_class cls
    JOIN pg_namespace ns ON ns.oid = cls.relnamespace
    JOIN pg_index ix ON ix.indexrelid = cls.oid
    WHERE cls.relkind = 'i' AND cls.relname LIKE 'idx_fk_%'
      AND ns.nspname IN ('public','private')
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_index other
      JOIN pg_class other_class ON other_class.oid = other.indexrelid
      JOIN pg_namespace other_ns ON other_ns.oid = other_class.relnamespace
      WHERE other.indrelid = current_index.indrelid
        AND other.indkey = current_index.indkey
        AND other.indexrelid <> (format('%I.%I', current_index.schema_name, current_index.index_name)::regclass)
        AND other.indisvalid
    ) THEN
      EXECUTE format('DROP INDEX IF EXISTS %I.%I', current_index.schema_name, current_index.index_name);
    END IF;
  END LOOP;
END $$;

