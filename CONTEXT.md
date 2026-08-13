# Paperflow Context

Paperflow is an offline processing pipeline that prepares OpenAlex work metadata, registers externally collected paper files, matches those files to works, parses PDFs, and stores parsed content blocks.

## Language

**Work**:
An OpenAlex paper work identified by `work_id`. A matched **Work** may be
referenced by at most one **Original File Job**.
_Avoid_: Paper, article, document when referring to the OpenAlex entity. Use
**Paper Management Record** for the admin-facing `file_id` resource.

**Source**:
An OpenAlex publication source such as a journal, identified by `source_id`.
_Avoid_: Journal when referring to the OpenAlex source entity.

**OpenAlex Metadata Import**:
The in-scope project step that imports target OpenAlex works, sources, work-source relationships, and authors into the project database.
_Avoid_: Collection, scraping.

**Original File Collection**:
The out-of-scope upstream activity that obtains paper files and CSV metadata from DOI-based or platform-based sources.
_Avoid_: OpenAlex metadata import.

**Original File Import**:
The in-scope project step that validates externally collected files already placed under the standard project paths and imports CSV metadata into unmatched original file records. It does not associate files to works.
_Avoid_: Collection, matching.

**Original File**:
A locally stored paper source file. Before matching it may not have a `work_id`; after matching it is associated with one **Work**.
_Avoid_: Parsed file, block.

**Original File Record**:
A database record for an **Original File**, including file metadata. Matching
state is stored on the related **Original File Job**. Repeated imports for the
same File Hash may upgrade the file type, choosing PDF before XML before HTML.
_Avoid_: Processing job, Work job.

**Paper Management Record (Paper)**:
The admin-facing resource identified by immutable `file_id`. It is backed by
one **Original File Record** and its **Original File Job**. A matched **Work**
supplements it with OpenAlex metadata but does not replace its identity or
original-file metadata.
_Avoid_: Work when referring to the Paper Management Record; Paper when
referring to an OpenAlex Work.

New records created by the admin platform derive `file_id` once from a
canonicalized Source ID, year, title, and ordered author list. Historical
records keep their existing File Hash identity. Editing metadata or replacing
the Original File never changes `file_id`.

**File Hash**:
The lowercase hexadecimal SHA-256 of canonical `source_id`, `year`, `paper_title`, and
semicolon-separated `authors`, used as the import identity for an **Original File Record**.
It is metadata-derived rather than a file-content hash.
_Avoid_: Content hash, checksum, filename stem.

**Original File Job**:
A file-level processing status record keyed by `file_id`. It tracks Matching,
Text Parsing, and Block Import state for one **Original File**.
_Avoid_: Work job, import record.

**Matching**:
The step that associates an **Original File Job** with a **Work**, either
directly when the File Hash is a `work_id` or by metadata matching. An
**Original File Job** with `flag_match=0` has not been attempted; `flag_match=-1`
means the latest attempt found no match and can be reset to `0` after OpenAlex
metadata changes.
_Avoid_: Parsing.

**Direct Work Match**:
A matching shortcut used when an **Original File** filename contains a `work_id` that already exists in the project database. If that `work_id` is not known locally, the file is still imported as an unmatched **Original File Record**.
_Avoid_: Target import, file validation.

**Text Parsing**:
The step that uses MinerU to parse a PDF **Original File** into structured
parsed output files. Text Parsing is driven by `flag_text` and file type, not by
Matching state.
_Avoid_: Vectorization.

**Block Import**:
The step that imports structured parsed outputs into the block-related database tables. It is separate from **Text Parsing** because MinerU output can exist before block rows are successfully written.
_Avoid_: Original file import, matching.

**Block Import Status**:
The file-level status, stored on the **Original File Job**, that records whether **Block Import** has not started, is complete, or failed.
_Avoid_: Text parsing status.

**Unsupported Text Input**:
An **Original File** whose file type is outside the current text parsing
capability. It is not a parsing failure because retrying the same parser will
not make it parseable.
_Avoid_: Parsing failure.

**Vectorization**:
A later processing stage outside the current version. Current-version processing jobs do not track vectorization status.

**Admin User**:
A person who can sign in to the Paperflow Admin Platform. An **Admin User** is
separate from OpenAlex authors and does not represent a Work, Source, or
Original File actor.
_Avoid_: User when it could mean an author, reader, or external account.

**Admin Role**:
A fixed authorization category assigned to an **Admin User**. Each **Admin
User** has one **Admin Role**; the current roles are Admin and Viewer.
_Avoid_: Permission matrix, dynamic role when referring to the current admin
platform roles.

**OpenAlex Source Search Snapshot**:
A searchable local projection of the read-only OpenAlex `sources` dataset.
It supports interactive Source selection but is not the authoritative source
for creation-time validation and is not user-managed Source data.
_Avoid_: Source CRUD, OpenAlex source table copy when referring to search.

**Soft-deleted Paper**:
A Paper hidden from normal management views whose database identity and file
versions are retained in the recovery area. It may be restored by an Admin or
Super Admin. Only a Super Admin may permanently delete it.
_Avoid_: Deleted Paper when physical removal has not completed.

**Original File Version**:
One immutable stored revision of an Original File. Replacing or restoring a
file creates a new version while the Paper `file_id` remains unchanged.
_Avoid_: Paper version when referring only to the uploaded file bytes.

## Example Dialogue

Developer: "After OpenAlex Metadata Import, do all target Works already have Original File Jobs?"

Domain expert: "No. OpenAlex Metadata Import only imports Work metadata. Original File Jobs are created by Original File Import and keyed by File Hash."

Developer: "If two files are collected for the same Work, should both become candidates?"

Domain expert: "For the same File Hash, keep one Original File Record and prefer PDF over XML over HTML during Original File Import."

Developer: "How do we deduplicate repeated Original File Imports?"

Domain expert: "Use File Hash, which is the filename without its extension. It is an import identity, not a content checksum."

Developer: "If an Original File is XML or HTML, did parsing fail?"

Domain expert: "No. It is an Unsupported Text Input in the current version; only PDFs enter Text Parsing."

Developer: "Does Text Parsing being complete mean block tables are ready?"

Domain expert: "No. Text Parsing only means MinerU produced parsed outputs; Block Import tracks whether those outputs were written to block tables."

Developer: "Where do we track Block Import completion?"

Domain expert: "On the Original File Job as a separate Block Import Status, not in the text parsing status."

Developer: "If a filename looks like a work_id but that Work is not in the local OpenAlex metadata, should import fail?"

Domain expert: "No. Only known work_id filenames become Direct Work Matches; unknown ones are imported unmatched and can go through metadata matching."

Developer: "How do we know an Original File Record failed to match?"

Domain expert: "The related Original File Job has `flag_match=-1` and an empty `matched_work_id`."

Developer: "Should a file named with a known work_id be associated during Original File Import?"

Domain expert: "No. Original File Import always registers unmatched records; Direct Work Match happens during Matching."

Developer: "Does Original File Collection happen inside Paperflow?"

Domain expert: "No. Paperflow imports externally collected files and CSV metadata, but does not collect files itself."

Developer: "When we say user management in the admin platform, do we mean OpenAlex authors?"

Domain expert: "No. User management is for Admin Users who sign in to the admin platform; authors remain Work metadata."

Developer: "Can each admin define custom permission groups?"

Domain expert: "No. Each Admin User receives one fixed Admin Role."
