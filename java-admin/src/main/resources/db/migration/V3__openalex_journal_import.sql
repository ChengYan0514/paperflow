ALTER TABLE openalex_source_search
    ADD COLUMN IF NOT EXISTS source_type varchar(64);

DELETE FROM openalex_source_search WHERE source_type IS DISTINCT FROM 'journal';

CREATE TABLE IF NOT EXISTS openalex_journal_import_task (
    task_id varchar(64) PRIMARY KEY,
    source_id varchar(255) NOT NULL,
    year_from integer,
    year_to integer,
    status varchar(16) NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
    created_by bigint,
    retry_of_task_id varchar(64) REFERENCES openalex_journal_import_task(task_id),
    worker_id varchar(255),
    lease_expires_at timestamptz,
    last_heartbeat_at timestamptz,
    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    progress_current integer NOT NULL DEFAULT 0,
    progress_total integer NOT NULL DEFAULT 0,
    progress_message varchar(1000),
    result jsonb,
    error_code varchar(80),
    error_message varchar(2000),
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    finished_at timestamptz,
    CHECK (year_from IS NULL OR year_to IS NULL OR year_from <= year_to),
    CHECK (progress_current >= 0 AND progress_total >= 0 AND progress_current <= progress_total)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_openalex_journal_import_task_active_source
    ON openalex_journal_import_task(source_id)
    WHERE status IN ('QUEUED', 'RUNNING');

CREATE INDEX IF NOT EXISTS idx_openalex_journal_import_task_source_created
    ON openalex_journal_import_task(source_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openalex_journal_import_task_claim
    ON openalex_journal_import_task(status, lease_expires_at, created_at);
