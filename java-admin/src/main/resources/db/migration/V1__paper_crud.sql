ALTER TABLE original_file ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS created_by bigint;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS updated_by bigint;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS deleted_by bigint;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS delete_reason varchar(500);
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS record_version bigint NOT NULL DEFAULT 0;
ALTER TABLE original_file ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_original_file_deleted_at ON original_file(deleted_at);
CREATE INDEX IF NOT EXISTS idx_original_file_source_deleted ON original_file(source_id, deleted_at);

CREATE TABLE IF NOT EXISTS original_file_version (
    file_id varchar(255) NOT NULL REFERENCES original_file(file_id) ON DELETE CASCADE,
    version_no integer NOT NULL,
    file_name varchar(255) NOT NULL,
    file_path varchar(1000) NOT NULL,
    file_type varchar(10) NOT NULL CHECK (file_type IN ('PDF', 'XML', 'HTML')),
    file_size bigint NOT NULL CHECK (file_size >= 0),
    uploaded_by bigint,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    is_current boolean NOT NULL DEFAULT false,
    PRIMARY KEY (file_id, version_no)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_original_file_version_current
    ON original_file_version(file_id) WHERE is_current;

INSERT INTO original_file_version
    (file_id, version_no, file_name, file_path, file_type, file_size, uploaded_at, is_current)
SELECT file_id, 1, original_file_name, original_file_path, original_file_type, file_size,
       COALESCE(created_at, now()), true
FROM original_file
ON CONFLICT (file_id, version_no) DO NOTHING;

CREATE TABLE IF NOT EXISTS file_cleanup_operation (
    operation_id varchar(64) PRIMARY KEY,
    file_id varchar(255) NOT NULL,
    operation_type varchar(32) NOT NULL CHECK (operation_type IN ('UPLOAD_MOVE', 'SOURCE_MOVE', 'SOFT_DELETE', 'RESTORE', 'PURGE')),
    status varchar(20) NOT NULL CHECK (status IN ('PENDING', 'FAILED', 'COMPLETE')),
    staged_path varchar(1000),
    target_path varchar(1000),
    last_error text,
    attempt_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS openalex_source_search (
    source_id varchar(255) PRIMARY KEY,
    display_name text NOT NULL,
    publisher text,
    issn_l text,
    issn jsonb,
    works_count integer,
    cited_by_count integer,
    is_oa boolean,
    is_in_doaj boolean,
    homepage_url text,
    source_updated_at timestamp,
    synced_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_openalex_source_name_trgm '
                'ON openalex_source_search USING gin (lower(display_name) gin_trgm_ops)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_openalex_source_publisher_trgm '
                'ON openalex_source_search USING gin (lower(publisher) gin_trgm_ops)';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_openalex_source_issn_l ON openalex_source_search(issn_l);
