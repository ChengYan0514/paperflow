CREATE TABLE IF NOT EXISTS original_file_import_batch (
    batch_id varchar(64) PRIMARY KEY,
    upload_name varchar(255) NOT NULL,
    upload_path varchar(1000) NOT NULL,
    upload_size bigint NOT NULL CHECK (upload_size >= 0),
    upload_sha256 varchar(64),
    status varchar(32) NOT NULL CHECK (status IN ('UPLOADING','VALIDATING','READY','IMPORTING','SUCCESS','PARTIAL_SUCCESS','FAILED','CANCELLED','EXPIRED')),
    created_by bigint,
    confirmed_by bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    total_rows integer NOT NULL DEFAULT 0,
    valid_rows integer NOT NULL DEFAULT 0,
    success_rows integer NOT NULL DEFAULT 0,
    skipped_rows integer NOT NULL DEFAULT 0,
    failed_rows integer NOT NULL DEFAULT 0,
    error_summary varchar(2000)
);

CREATE INDEX IF NOT EXISTS idx_original_file_import_batch_status
    ON original_file_import_batch(status, updated_at);

CREATE TABLE IF NOT EXISTS original_file_import_item (
    batch_id varchar(64) NOT NULL REFERENCES original_file_import_batch(batch_id) ON DELETE CASCADE,
    row_number integer NOT NULL,
    file_id varchar(255),
    file_path varchar(1000),
    file_name varchar(255),
    source_id varchar(255),
    year integer,
    paper_title varchar(2000),
    authors varchar(2000),
    doi varchar(500),
    url varchar(2000),
    provider varchar(255),
    file_type varchar(10),
    file_size bigint,
    status varchar(32) NOT NULL CHECK (status IN ('PENDING','VALID','SUCCESS','SKIPPED','FAILED')),
    error_code varchar(80),
    error_message varchar(2000),
    warning_message varchar(2000),
    imported_at timestamptz,
    PRIMARY KEY (batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_original_file_import_item_status
    ON original_file_import_item(batch_id, status, row_number);
