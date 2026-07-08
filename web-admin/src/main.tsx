import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import katex from "katex";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";
import "katex/dist/katex.min.css";
import "./styles.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

const fieldLabels: Record<string, string> = {
  sourceId: "来源期刊 ID",
  sourceName: "来源期刊名称",
  provider: "平台",
  workCount: "论文数",
  originalFileCount: "原始文件数",
  matchedFileCount: "已匹配文件数",
  parsedFileCount: "已解析文件数",
  readyFileCount: "就绪文件数",
  parseFailedFileCount: "解析失败文件数",
  blockFailedFileCount: "内容块入库失败文件数",
  unsupportedFileCount: "不支持解析文件数",
  sourceCount: "来源期刊数",
  matchedWorkCount: "匹配成功论文数",
  blockImportedFileCount: "全文入库文件数",
  workId: "论文 ID",
  title: "标题",
  doi: "DOI",
  publicationYear: "发表年份",
  publicationDate: "发表日期",
  type: "类型",
  language: "语言",
  sourceIds: "来源期刊 ID",
  processingStatus: "匹配文件状态",
  matchedFileId: "匹配文件 ID",
  matchedWorkId: "匹配论文 ID",
  hasOriginalFiles: "有原始文件",
  hasFailures: "有失败",
  stage: "阶段",
  sort: "排序",
  yearFrom: "起始年份",
  yearTo: "结束年份",
  authorId: "作者 ID",
  authorName: "作者姓名",
  authorPosition: "作者位置",
  fileId: "文件 ID",
  originalFileType: "原始文件类型",
  originalFileName: "原始文件名",
  originalFilePath: "原始文件路径",
  originalFileUrl: "原始文件预览",
  fileSize: "文件大小",
  paperTitle: "论文标题",
  authors: "作者",
  url: "URL",
  year: "年份",
  flagMatch: "匹配状态",
  flagText: "文本解析状态",
  flagBlock: "内容块入库状态",
  fileType: "文件类型",
  fileName: "文件名",
  filePath: "文件路径",
  fileUrl: "文件预览",
  blockId: "块 ID",
  blockSeq: "块序号",
  blockType: "块类型",
  blockText: "块文本",
  pdfPage: "PDF 页码",
  pdfBbox: "PDF 边界框",
  parentTitleBlockId: "父标题块 ID",
  titleLevel: "标题层级",
  imagePath: "图片路径",
  imageUrl: "图片预览",
  imageCaption: "图片标题",
  imageFootnote: "图片脚注",
  tableImagePath: "表格图片路径",
  tableImageUrl: "表格图片预览",
  tableCaption: "表格标题",
  tableFootnote: "表格脚注",
  equationImagePath: "公式图片路径",
  equationImageUrl: "公式图片预览",
  equationFormat: "公式格式",
  footnoteLabel: "脚注标签",
  footnoteText: "脚注文本",
  references: "参考文献",
};

const valueLabels: Record<string, string> = {
  NO_MATCHED_FILE: "未匹配原始文件",
  MATCHED: "已匹配",
  PARSING: "解析中",
  PARSE_FAILED: "解析失败",
  UNSUPPORTED_TEXT_INPUT: "不支持解析",
  PARSED: "已解析",
  BLOCK_FAILED: "内容块入库失败",
  READY: "就绪",
  first: "第一作者",
  middle: "中间作者",
  last: "末位作者",
  title: "标题",
  text: "正文",
  equation: "公式",
  table: "表格",
  image: "图片",
  reference: "参考文献",
  page_footnote: "页脚注",
  discarded: "丢弃块",
  sourceIdAsc: "来源期刊 ID 升序",
  workCountDesc: "论文数降序",
  failureCountDesc: "失败数降序",
  publicationYearDesc: "发表年份降序",
  publicationYearAsc: "发表年份升序",
  titleAsc: "标题升序",
  statusIssueFirst: "异常优先",
  statusReadyFirst: "就绪优先",
  yearDesc: "年份降序",
  fileSizeAsc: "文件大小升序",
  providerAsc: "平台升序",
  textStatusIssueFirst: "解析异常优先",
  originalFileCountDesc: "原始文件数降序",
  matchedProgressAsc: "匹配进度升序",
  parsedProgressAsc: "解析进度升序",
  blockImportedProgressAsc: "入库进度升序",
  abnormalCountDesc: "异常数降序",
  MATCHING: "论文匹配",
  TEXT_PARSING: "文件解析",
  BLOCK_IMPORT: "全文入库",
  true: "是",
  false: "否",
};

function fieldLabel(value: string) {
  return fieldLabels[value] ?? value;
}

function valueLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return valueLabels[String(value)] ?? String(value);
}

function flagLabel(kind: string | undefined, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  const labels: Record<string, Record<string, string>> = {
    flagMatch: { "-1": "未匹配 (-1)", "0": "未尝试 (0)", "1": "已匹配 (1)" },
    flagText: { "-2": "不支持解析 (-2)", "-1": "解析失败 (-1)", "0": "未解析 (0)", "1": "解析中 (1)", "2": "解析完成 (2)" },
    flagBlock: { "-1": "入库失败 (-1)", "0": "未入库 (0)", "1": "入库完成 (1)" },
  };
  return labels[kind ?? ""]?.[String(value)] ?? valueLabel(value);
}

type ProcessingStatus =
  | "NO_MATCHED_FILE"
  | "MATCHED"
  | "PARSING"
  | "PARSE_FAILED"
  | "UNSUPPORTED_TEXT_INPUT"
  | "PARSED"
  | "BLOCK_FAILED"
  | "READY";

type ApiError = { code: string; message: string; requestId: string };
type Page<T> = { items: T[]; page: number; size: number; total: number };
type SourceStats = {
  workCount: number;
  originalFileCount: number;
  matchedFileCount: number;
  parsedFileCount: number;
  readyFileCount: number;
  parseFailedFileCount: number;
  blockFailedFileCount: number;
  unsupportedFileCount: number;
};
type SourceSummary = {
  sourceId: string;
  sourceName: string | null;
  provider: string | null;
  stats: SourceStats;
};
type TaskStatusTotals = {
  sourceCount: number;
  workCount: number;
  originalFileCount: number;
  matchedWorkCount: number;
  parsedFileCount: number;
  blockImportedFileCount: number;
};
type TaskStatusSource = {
  sourceId: string;
  sourceName: string | null;
  provider: string | null;
  workCount: number;
  originalFileCount: number;
  matchedWorkCount: number;
  parsedFileCount: number;
  blockImportedFileCount: number;
};
type TaskStatus = { totals: TaskStatusTotals; sources: TaskStatusSource[] };
type WorkListItem = WorkMetadata & {
  sourceIds: string[];
  processingStatus: ProcessingStatus;
  matchedFileId: string | null;
  flagMatch: number | null;
  flagText: number | null;
  flagBlock: number | null;
};
type WorkMetadata = {
  workId: string;
  title: string | null;
  doi: string | null;
  publicationYear: number | null;
  publicationDate: string | null;
  type: string | null;
  language: string | null;
};
type SourceBrief = { sourceId: string; sourceName: string | null; provider: string | null };
type Author = { authorId: string; authorName: string | null; authorPosition: string | null };
type TextFile = { fileId: string; fileType: string; fileName: string; filePath: string; fileUrl: string; fileSize: number };
type OriginalFile = {
  fileId: string;
  sourceId: string;
  year: number | null;
  paperTitle: string | null;
  authors: string | null;
  doi: string | null;
  url: string | null;
  provider: string | null;
  originalFileName: string;
  originalFilePath: string;
  originalFileUrl: string;
  originalFileType: string;
  fileSize: number;
  flagMatch: number;
  matchedWorkId: string | null;
  flagText: number;
  flagBlock: number;
  textFiles: TextFile[];
};
type WorkDetail = {
  work: WorkMetadata;
  sources: SourceBrief[];
  authors: Author[];
  matchedFile: OriginalFile | null;
  processingStatus: ProcessingStatus;
};
type Block = {
  blockId: string;
  fileId: string;
  blockType: string;
  blockText: string | null;
  pdfPage: number | null;
  pdfBbox: unknown | null;
  blockSeq: number;
  parentTitleBlockId: string | null;
  titleLevel: number | null;
  imagePath: string | null;
  imageUrl: string | null;
  imageCaption: string | null;
  imageFootnote: string | null;
  tableImagePath: string | null;
  tableImageUrl: string | null;
  tableCaption: string | null;
  tableFootnote: string | null;
  equationImagePath: string | null;
  equationImageUrl: string | null;
  equationFormat: string | null;
  footnoteLabel: string | null;
  footnoteText: string | null;
  references: string[] | null;
};

class HttpError extends Error {
  constructor(public error: ApiError, public status: number) {
    super(error.message);
  }
}

async function getJson<T>(path: string, params?: URLSearchParams): Promise<T> {
  const query = params?.toString();
  const response = await fetch(`${apiBaseUrl}${path}${query ? `?${query}` : ""}`);
  if (!response.ok) {
    let error: ApiError = { code: "HTTP_ERROR", message: response.statusText, requestId: "-" };
    try {
      error = (await response.json()) as ApiError;
    } catch {
      // keep fallback
    }
    throw new HttpError(error, response.status);
  }
  return (await response.json()) as T;
}

function assetUrl(path: string | null | undefined) {
  if (!path) return null;
  return path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
}

function paramsFrom(searchParams: URLSearchParams, keys: string[]): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of keys) {
    const value = searchParams.get(key)?.trim();
    if (value) params.set(key, value);
  }
  if (!params.has("page")) params.set("page", "1");
  if (!params.has("size")) params.set("size", "20");
  return params;
}

function Layout() {
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <span>Paperflow</span>
          <small>只读处理台</small>
        </div>
        <NavGroup title="文献资源" paths={["/task-status", "/sources", "/works", "/original-files"]}>
          <NavLink to="/task-status">工作台</NavLink>
          <NavLink to="/sources">来源期刊</NavLink>
          <NavLink to="/works">论文</NavLink>
          <NavLink to="/original-files">原始文件</NavLink>
        </NavGroup>
        <NavGroup title="用户管理" paths={["/users", "/roles"]}>
          <NavLink to="/users">用户列表</NavLink>
          <NavLink to="/roles">角色权限</NavLink>
        </NavGroup>
        <NavGroup title="服务管理" paths={["/service-status"]}>
          <NavLink to="/service-status">服务状态</NavLink>
          <a href={`${apiBaseUrl}/swagger-ui/index.html`} target="_blank" rel="noreferrer">
            API 文档
          </a>
        </NavGroup>
        <NavGroup title="知识管理" paths={["/knowledge-base", "/block-search"]}>
          <NavLink to="/knowledge-base">知识库</NavLink>
          <NavLink to="/block-search">内容块检索</NavLink>
        </NavGroup>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

function NavGroup({ title, paths, children }: { title: string; paths: string[]; children: React.ReactNode }) {
  const location = useLocation();
  const defaultOpen = paths.some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const [open, setOpen] = React.useState(defaultOpen);
  React.useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
  return (
    <details className="nav-section" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <span className="nav-chevron" aria-hidden="true">›</span>
        <span>{title}</span>
      </summary>
      <div className="nav-items">{children}</div>
    </details>
  );
}

function PageHeader({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <span className="page-kicker">OpenAlex / Original Files</span>
        <h1>{title}</h1>
      </div>
      {meta ? <div className="muted">{meta}</div> : null}
    </header>
  );
}

function Loading() {
  return <div className="state state-loading">加载中</div>;
}

function Empty() {
  return <div className="state">暂无数据</div>;
}

function ErrorState({ error }: { error: unknown }) {
  if (error instanceof HttpError) {
    return (
      <div className="error">
        <strong>{error.error.code}</strong>
        <span>{error.error.message}</span>
        <small>{error.error.requestId}</small>
      </div>
    );
  }
  return <div className="error">请求失败</div>;
}

function QueryView<T>({ query, children }: { query: UseQueryResult<T, Error>; children: (data: T) => React.ReactNode }) {
  if (query.isLoading) return <Loading />;
  if (query.isError) return <ErrorState error={query.error} />;
  return <>{children(query.data as T)}</>;
}

function Pager({ page, size, total }: { page: number; size: number; total: number }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const last = Math.max(1, Math.ceil(total / size));
  const go = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(next));
    params.set("size", String(size));
    setSearchParams(params);
  };
  return (
    <div className="pager">
      <button type="button" onClick={() => go(page - 1)} disabled={page <= 1}>
        上一页
      </button>
      <span>
        第 {page} / {last} 页，共 {total} 条
      </span>
      <button type="button" onClick={() => go(page + 1)} disabled={page >= last}>
        下一页
      </button>
    </div>
  );
}

function Filters({ fields, status }: { fields: { name: string; label: string; type?: string; options?: string[] }[]; status?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const apply = (formData: FormData) => {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    params.set("page", "1");
    params.set("size", searchParams.get("size") ?? "20");
    setSearchParams(params);
  };
  return (
    <form key={searchParams.toString()} action={apply} className="filters">
      {fields.map((field) => (
        <label key={field.name}>
          <span>{field.label}</span>
          {field.options ? (
            <select name={field.name} defaultValue={searchParams.get(field.name) ?? ""}>
              <option value="">{field.name === "sort" ? "默认排序" : "全部"}</option>
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {field.name === "sort" || field.name.startsWith("has") ? valueLabel(option) : flagLabel(field.name, option)}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.name} type={field.type ?? "text"} defaultValue={searchParams.get(field.name) ?? ""} />
          )}
        </label>
      ))}
      {status ? (
        <label>
          <span>{fieldLabel("processingStatus")}</span>
          <select name="processingStatus" defaultValue={searchParams.get("processingStatus") ?? ""}>
            <option value="">全部</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {valueLabel(item)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button type="submit">筛选</button>
      <button type="button" onClick={() => setSearchParams({ page: "1", size: searchParams.get("size") ?? "20" })}>
        清空
      </button>
    </form>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p className="help-text">{children}</p>;
}

const statuses: ProcessingStatus[] = [
  "NO_MATCHED_FILE",
  "MATCHED",
  "PARSING",
  "PARSE_FAILED",
  "UNSUPPORTED_TEXT_INPUT",
  "PARSED",
  "BLOCK_FAILED",
  "READY",
];

function StatusBadge({ value, kind }: { value: string | number | null; kind?: string }) {
  return (
    <span className={`badge badge-${String(value).toLowerCase().replaceAll("_", "-")}`} title={value === null ? undefined : String(value)}>
      {flagLabel(kind, value)}
    </span>
  );
}

function text(value: React.ReactNode) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function bytes(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value.toLocaleString()} B`;
}

function truncate(value: string | null | undefined, length = 180) {
  if (!value) return "-";
  return value.length > length ? `${value.slice(0, length)}...` : value;
}

function SourcesPage() {
  const [searchParams] = useSearchParams();
  const params = paramsFrom(searchParams, [
    "sourceId",
    "sourceName",
    "provider",
    "hasOriginalFiles",
    "hasFailures",
    "sort",
    "page",
    "size",
  ]);
  const query = useQuery({ queryKey: ["sources", params.toString()], queryFn: () => getJson<Page<SourceSummary>>("/api/sources", params) });
  return (
    <>
      <PageHeader title="来源期刊列表" />
      <Filters
        fields={[
          { name: "sourceId", label: fieldLabel("sourceId") },
          { name: "sourceName", label: fieldLabel("sourceName") },
          { name: "provider", label: fieldLabel("provider") },
          { name: "hasOriginalFiles", label: fieldLabel("hasOriginalFiles"), options: ["true", "false"] },
          { name: "hasFailures", label: fieldLabel("hasFailures"), options: ["true", "false"] },
          { name: "sort", label: fieldLabel("sort"), options: ["sourceIdAsc", "workCountDesc", "failureCountDesc"] },
        ]}
      />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{fieldLabel("sourceId")}</th>
                      <th>{fieldLabel("sourceName")}</th>
                      <th>{fieldLabel("provider")}</th>
                      <th>{fieldLabel("workCount")}</th>
                      <th>{fieldLabel("originalFileCount")}</th>
                      <th>{fieldLabel("matchedFileCount")}</th>
                      <th>{fieldLabel("parsedFileCount")}</th>
                      <th>{fieldLabel("readyFileCount")}</th>
                      <th>{fieldLabel("parseFailedFileCount")}</th>
                      <th>{fieldLabel("blockFailedFileCount")}</th>
                      <th>{fieldLabel("unsupportedFileCount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((source) => (
                      <tr key={source.sourceId}>
                        <td>
                          <Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>
                        </td>
                        <td>{text(source.sourceName)}</td>
                        <td>{text(source.provider)}</td>
                        <td>{source.stats.workCount}</td>
                        <td>{source.stats.originalFileCount}</td>
                        <td>{source.stats.matchedFileCount}</td>
                        <td>{source.stats.parsedFileCount}</td>
                        <td>{source.stats.readyFileCount}</td>
                        <td>{source.stats.parseFailedFileCount}</td>
                        <td>{source.stats.blockFailedFileCount}</td>
                        <td>{source.stats.unsupportedFileCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            <Pager page={data.page} size={data.size} total={data.total} />
          </>
        )}
      </QueryView>
    </>
  );
}

function TaskStatusPage() {
  const [searchParams] = useSearchParams();
  const query = useQuery({ queryKey: ["task-status"], queryFn: () => getJson<TaskStatus>("/api/task-status") });
  return (
    <>
      <PageHeader title="工作台" meta="全库与各来源期刊处理进度" />
      <Filters
        fields={[
          { name: "sourceId", label: fieldLabel("sourceId") },
          { name: "sourceName", label: fieldLabel("sourceName") },
          { name: "provider", label: fieldLabel("provider") },
          { name: "stage", label: fieldLabel("stage"), options: ["MATCHING", "TEXT_PARSING", "BLOCK_IMPORT"] },
          {
            name: "sort",
            label: fieldLabel("sort"),
            options: ["sourceIdAsc", "workCountDesc", "originalFileCountDesc", "matchedProgressAsc", "parsedProgressAsc", "blockImportedProgressAsc", "abnormalCountDesc"],
          },
        ]}
      />
      <QueryView query={query}>
        {(data) => {
          const sources = taskStatusSources(data.sources, searchParams);
          return (
            <>
              <section className="stats">
                {Object.entries(data.totals).map(([key, value]) => (
                  <div key={key} className="stat">
                    <span>{fieldLabel(key)}</span>
                    <strong>{value.toLocaleString()}</strong>
                  </div>
                ))}
              </section>
              <section>
                <h2>各来源期刊进度</h2>
                {sources.length ? (
                  <div className="status-list">
                    {sources.map((source) => (
                      <div key={source.sourceId} className={`status-card status-stage-${searchParams.get("stage")?.toLowerCase() ?? "all"}`}>
                        <div>
                          <Link to={`/sources/${source.sourceId}`}>{source.sourceId}</Link>
                          <strong>{source.sourceName ?? "-"}</strong>
                          <span>{source.provider ?? "-"}</span>
                        </div>
                        <ProgressBar stage="match" label="论文匹配" value={source.matchedWorkCount} total={source.workCount} />
                        <ProgressBar stage="text" label="文件解析" value={source.parsedFileCount} total={source.originalFileCount} />
                        <ProgressBar stage="block" label="全文入库" value={source.blockImportedFileCount} total={source.originalFileCount} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty />
                )}
              </section>
            </>
          );
        }}
      </QueryView>
    </>
  );
}

function taskStatusSources(sources: TaskStatusSource[], searchParams: URLSearchParams) {
  const sourceId = searchParams.get("sourceId")?.trim().toLowerCase();
  const sourceName = searchParams.get("sourceName")?.trim().toLowerCase();
  const provider = searchParams.get("provider")?.trim().toLowerCase();
  const sort = searchParams.get("sort") ?? "sourceIdAsc";
  const progress = (value: number, total: number) => (total > 0 ? value / total : 1);
  const abnormalCount = (source: TaskStatusSource) =>
    (source.workCount - source.matchedWorkCount) +
    (source.originalFileCount - source.parsedFileCount) +
    (source.originalFileCount - source.blockImportedFileCount);
  return sources
    .filter((source) => {
      return (
        (!sourceId || source.sourceId.toLowerCase().includes(sourceId)) &&
        (!sourceName || (source.sourceName ?? "").toLowerCase().includes(sourceName)) &&
        (!provider || (source.provider ?? "").toLowerCase().includes(provider))
      );
    })
    .sort((left, right) => {
      if (sort === "workCountDesc") return right.workCount - left.workCount || left.sourceId.localeCompare(right.sourceId);
      if (sort === "originalFileCountDesc") return right.originalFileCount - left.originalFileCount || left.sourceId.localeCompare(right.sourceId);
      if (sort === "matchedProgressAsc") return progress(left.matchedWorkCount, left.workCount) - progress(right.matchedWorkCount, right.workCount) || left.sourceId.localeCompare(right.sourceId);
      if (sort === "parsedProgressAsc") return progress(left.parsedFileCount, left.originalFileCount) - progress(right.parsedFileCount, right.originalFileCount) || left.sourceId.localeCompare(right.sourceId);
      if (sort === "blockImportedProgressAsc") {
        return progress(left.blockImportedFileCount, left.originalFileCount) - progress(right.blockImportedFileCount, right.originalFileCount) || left.sourceId.localeCompare(right.sourceId);
      }
      if (sort === "abnormalCountDesc") return abnormalCount(right) - abnormalCount(left) || left.sourceId.localeCompare(right.sourceId);
      return left.sourceId.localeCompare(right.sourceId);
    });
}

function ProgressBar({ stage, label, value, total }: { stage?: "match" | "text" | "block"; label: string; value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`progress-row ${stage ? `progress-${stage}` : ""} ${percent >= 100 ? "progress-complete" : ""}`}>
      <span>
        {label} {value.toLocaleString()} / {total.toLocaleString()}
      </span>
      <div className="progress-track" aria-label={`${label} ${percent}%`}>
        <div style={{ width: `${percent}%` }} />
      </div>
      <strong>{percent}%</strong>
    </div>
  );
}

function SourceDetailPage() {
  const { sourceId = "" } = useParams();
  const query = useQuery({ queryKey: ["source", sourceId], queryFn: () => getJson<SourceSummary>(`/api/sources/${sourceId}`) });
  return (
    <>
      <PageHeader title="来源期刊详情" meta={sourceId} />
      <QueryView query={query}>
        {(source) => (
          <>
            <section className="detail-grid">
              <Field label={fieldLabel("sourceId")} value={source.sourceId} />
              <Field label={fieldLabel("sourceName")} value={source.sourceName} />
              <Field label={fieldLabel("provider")} value={source.provider} />
            </section>
            <section>
              <h2>统计</h2>
              <div className="stats">
                {Object.entries(source.stats).map(([key, value]) => (
                  <div key={key} className="stat">
                    <span>{fieldLabel(key)}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
            <div className="actions">
              <Link to={`/works?sourceId=${encodeURIComponent(source.sourceId)}`}>查看论文</Link>
              <Link to={`/original-files?sourceId=${encodeURIComponent(source.sourceId)}`}>查看原始文件</Link>
            </div>
          </>
        )}
      </QueryView>
    </>
  );
}

function WorksPage() {
  const [searchParams] = useSearchParams();
  const params = paramsFrom(searchParams, [
    "sourceId",
    "workId",
    "sourceName",
    "authorName",
    "title",
    "doi",
    "yearFrom",
    "yearTo",
    "processingStatus",
    "type",
    "language",
    "matchedFileId",
    "sort",
    "page",
    "size",
  ]);
  const query = useQuery({ queryKey: ["works", params.toString()], queryFn: () => getJson<Page<WorkListItem>>("/api/works", params) });
  return (
    <>
      <PageHeader title="论文列表" />
      <Filters
        status
        fields={[
          { name: "sourceId", label: fieldLabel("sourceId") },
          { name: "workId", label: fieldLabel("workId") },
          { name: "sourceName", label: fieldLabel("sourceName") },
          { name: "authorName", label: fieldLabel("authorName") },
          { name: "title", label: fieldLabel("title") },
          { name: "doi", label: fieldLabel("doi") },
          { name: "yearFrom", label: fieldLabel("yearFrom"), type: "number" },
          { name: "yearTo", label: fieldLabel("yearTo"), type: "number" },
          { name: "type", label: fieldLabel("type") },
          { name: "language", label: fieldLabel("language") },
          { name: "matchedFileId", label: fieldLabel("matchedFileId") },
          {
            name: "sort",
            label: fieldLabel("sort"),
            options: ["publicationYearDesc", "publicationYearAsc", "titleAsc", "statusIssueFirst", "statusReadyFirst"],
          },
        ]}
      />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{fieldLabel("workId")}</th>
                      <th>{fieldLabel("title")}</th>
                      <th>{fieldLabel("doi")}</th>
                      <th>{fieldLabel("publicationYear")}</th>
                      <th>{fieldLabel("sourceIds")}</th>
                      <th>{fieldLabel("processingStatus")}</th>
                      <th>{fieldLabel("matchedFileId")}</th>
                      <th>{fieldLabel("flagMatch")}</th>
                      <th>{fieldLabel("flagText")}</th>
                      <th>{fieldLabel("flagBlock")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((work) => (
                      <tr key={work.workId}>
                        <td>
                          <Link to={`/works/${work.workId}`}>{work.workId}</Link>
                        </td>
                        <td>{text(work.title)}</td>
                        <td>{text(work.doi)}</td>
                        <td>{text(work.publicationYear)}</td>
                        <td>{work.sourceIds.join(", ")}</td>
                        <td>
                          <StatusBadge value={work.processingStatus} />
                        </td>
                        <td>{work.matchedFileId ? <Link to={`/original-files/${work.matchedFileId}`}>{work.matchedFileId}</Link> : "-"}</td>
                        <td>
                          <StatusBadge value={work.flagMatch} kind="flagMatch" />
                        </td>
                        <td>
                          <StatusBadge value={work.flagText} kind="flagText" />
                        </td>
                        <td>
                          <StatusBadge value={work.flagBlock} kind="flagBlock" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            <Pager page={data.page} size={data.size} total={data.total} />
          </>
        )}
      </QueryView>
    </>
  );
}

function WorkDetailPage() {
  const { workId = "" } = useParams();
  const query = useQuery({ queryKey: ["work", workId], queryFn: () => getJson<WorkDetail>(`/api/works/${workId}`) });
  return (
    <>
      <PageHeader title="论文详情" meta={workId} />
      <QueryView query={query}>
        {(detail) => (
          <>
            <section className="detail-grid">
              <Field label={fieldLabel("workId")} value={detail.work.workId} />
              <Field label={fieldLabel("title")} value={detail.work.title} wide />
              <Field label={fieldLabel("doi")} value={detail.work.doi} />
              <Field label={fieldLabel("publicationYear")} value={detail.work.publicationYear} />
              <Field label={fieldLabel("publicationDate")} value={detail.work.publicationDate} />
              <Field label={fieldLabel("type")} value={detail.work.type} />
              <Field label={fieldLabel("language")} value={detail.work.language} />
              <Field label={fieldLabel("processingStatus")} value={<StatusBadge value={detail.processingStatus} />} />
            </section>
            <section>
              <h2>来源期刊</h2>
              {detail.sources.length ? (
                <div className="chips">
                  {detail.sources.map((source) => (
                    <Link key={source.sourceId} to={`/sources/${source.sourceId}`}>
                      {source.sourceId} {source.sourceName ? `· ${source.sourceName}` : ""}
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty />
              )}
            </section>
            <section>
              <h2>作者</h2>
              {detail.authors.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{fieldLabel("authorId")}</th>
                        <th>{fieldLabel("authorName")}</th>
                        <th>{fieldLabel("authorPosition")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.authors.map((author) => (
                        <tr key={author.authorId}>
                          <td>{author.authorId}</td>
                          <td>{text(author.authorName)}</td>
                          <td>{valueLabel(author.authorPosition)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
            </section>
            <section>
              <h2>匹配的原始文件</h2>
              {detail.matchedFile ? <OriginalFileSummary file={detail.matchedFile} /> : <div className="state">{valueLabel("NO_MATCHED_FILE")}</div>}
            </section>
            <div className="actions">
              <Link to={`/works/${workId}/blocks`}>查看内容块</Link>
              {detail.matchedFile ? <Link to={`/original-files/${detail.matchedFile.fileId}`}>查看匹配的原始文件</Link> : null}
            </div>
          </>
        )}
      </QueryView>
    </>
  );
}

function WorkBlocksPage() {
  const { workId = "" } = useParams();
  return <BlocksReaderPage title="论文全文" meta={workId} queryKey={["blocks", workId]} path={`/api/works/${workId}/blocks`} />;
}

function BlocksReaderPage({ title, meta, queryKey, path }: { title: string; meta: string; queryKey: string[]; path: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const includeDiscarded = searchParams.get("includeDiscarded") === "true";
  const query = useQuery({ queryKey: [...queryKey, includeDiscarded], queryFn: () => getAllBlocks(path, includeDiscarded) });
  return (
    <>
      <PageHeader title={title} meta={meta} />
      <form
        key={searchParams.toString()}
        className="filters"
        action={(formData) => {
          const params = new URLSearchParams();
          if (formData.get("includeDiscarded") === "on") params.set("includeDiscarded", "true");
          params.set("page", "1");
          params.set("size", searchParams.get("size") ?? "100");
          setSearchParams(params);
        }}
      >
        <label className="check">
          <input name="includeDiscarded" type="checkbox" defaultChecked={searchParams.get("includeDiscarded") === "true"} />
          <span>包含丢弃块</span>
        </label>
        <button type="submit">筛选</button>
      </form>
      <QueryView query={query}>
        {(blocks) => (
          blocks.length ? (
            <div className="reader-frame">
              <article className="reader-article">
                {blocks.map((block) => (
                  <ArticleBlock key={block.blockId} block={block} />
                ))}
              </article>
            </div>
          ) : (
            <Empty />
          )
        )}
      </QueryView>
    </>
  );
}

async function getAllBlocks(path: string, includeDiscarded: boolean): Promise<Block[]> {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("size", "500");
  if (includeDiscarded) params.set("includeDiscarded", "true");
  const first = await getJson<Page<Block>>(path, params);
  const items = [...first.items];
  const last = Math.max(1, Math.ceil(first.total / first.size));
  for (let page = 2; page <= last; page += 1) {
    params.set("page", String(page));
    const next = await getJson<Page<Block>>(path, params);
    items.push(...next.items);
  }
  return items;
}

function ArticleBlock({ block }: { block: Block }) {
  if (block.blockType === "title") {
    const level = Math.min(Math.max((block.titleLevel ?? 0) + 2, 2), 5);
    return React.createElement(`h${level}`, { className: `article-title article-title-${level}` }, block.blockText ?? "-");
  }
  if (block.blockType === "equation") {
    const equationImage = assetUrl(block.equationImageUrl);
    const equationHtml = latexMarkup(block.blockText);
    return (
      <figure className="article-equation">
        {equationImage ? <img src={equationImage} alt={block.blockText ?? "equation"} loading="lazy" /> : null}
        {equationHtml ? (
          <div className="article-equation-math" dangerouslySetInnerHTML={{ __html: equationHtml }} />
        ) : block.blockText ? (
          <div className="article-equation-text">{block.blockText}</div>
        ) : null}
      </figure>
    );
  }
  if (block.blockType === "table") {
    const tableImage = assetUrl(block.tableImageUrl);
    const tableHtml = tableMarkup(block.blockText);
    return (
      <figure className="article-table">
        {tableImage ? <img src={tableImage} alt={block.tableCaption ?? "table"} loading="lazy" /> : null}
        {tableHtml ? (
          <div className="article-table-html" dangerouslySetInnerHTML={{ __html: tableHtml }} />
        ) : block.blockText ? (
          <pre className="article-table-text">{block.blockText}</pre>
        ) : null}
        {block.tableCaption ? <figcaption>{block.tableCaption}</figcaption> : null}
        {block.tableFootnote ? <p className="article-footnote">{block.tableFootnote}</p> : null}
      </figure>
    );
  }
  if (block.blockType === "image") {
    const image = assetUrl(block.imageUrl);
    return (
      <figure className="article-figure">
        {image ? <img src={image} alt={block.imageCaption ?? "image"} loading="lazy" /> : null}
        {block.blockText ? <p>{block.blockText}</p> : null}
        {block.imageCaption ? <figcaption>{block.imageCaption}</figcaption> : null}
        {block.imageFootnote ? <p className="article-footnote">{block.imageFootnote}</p> : null}
      </figure>
    );
  }
  if (block.blockType === "reference" || block.references?.length) {
    const references = block.references?.length ? block.references : block.blockText ? [block.blockText] : [];
    return (
      <ol className="article-references">
        {references.map((reference, index) => (
          <li key={`${block.blockId}-${index}`}>{reference}</li>
        ))}
      </ol>
    );
  }
  if (block.blockType === "page_footnote" || block.footnoteText) {
    return <p className="article-footnote">{block.footnoteLabel ? `${block.footnoteLabel} ` : ""}{block.footnoteText ?? block.blockText}</p>;
  }
  if (!block.blockText) {
    return null;
  }
  return <p className="article-paragraph">{block.blockText}</p>;
}

function tableMarkup(value: string | null | undefined) {
  if (!value || !value.trim().toLowerCase().startsWith("<table")) return null;
  const doc = new DOMParser().parseFromString(value, "text/html");
  const table = doc.querySelector("table");
  if (!table) return null;
  sanitizeTable(table);
  return table.outerHTML;
}

function latexMarkup(value: string | null | undefined) {
  const latex = latexSource(value);
  if (!latex) return null;
  try {
    return katex.renderToString(latex, {
      displayMode: true,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

function latexSource(value: string | null | undefined) {
  if (!value) return null;
  let latex = value.trim();
  if (latex.startsWith("$$") && latex.endsWith("$$")) {
    latex = latex.slice(2, -2).trim();
  } else if (latex.startsWith("\\[") && latex.endsWith("\\]")) {
    latex = latex.slice(2, -2).trim();
  }
  return latex || null;
}

function sanitizeTable(element: Element) {
  const allowedTags = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD"]);
  const allowedAttrs = new Set(["rowspan", "colspan"]);
  for (const child of Array.from(element.querySelectorAll("*"))) {
    if (!allowedTags.has(child.tagName)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      if (!allowedAttrs.has(attr.name.toLowerCase())) child.removeAttribute(attr.name);
    }
  }
}

function OriginalFilesPage() {
  const [searchParams] = useSearchParams();
  const params = paramsFrom(searchParams, [
    "sourceId",
    "fileId",
    "sourceName",
    "provider",
    "matchedWorkId",
    "flagMatch",
    "flagText",
    "flagBlock",
    "originalFileType",
    "yearFrom",
    "yearTo",
    "sort",
    "page",
    "size",
  ]);
  const query = useQuery({ queryKey: ["original-files", params.toString()], queryFn: () => getJson<Page<OriginalFile>>("/api/original-files", params) });
  return (
    <>
      <PageHeader title="原始文件列表" />
      <Filters
        fields={[
          { name: "sourceId", label: fieldLabel("sourceId") },
          { name: "fileId", label: fieldLabel("fileId") },
          { name: "sourceName", label: fieldLabel("sourceName") },
          { name: "provider", label: fieldLabel("provider") },
          { name: "matchedWorkId", label: fieldLabel("matchedWorkId") },
          { name: "flagMatch", label: fieldLabel("flagMatch"), options: ["-1", "0", "1"] },
          { name: "flagText", label: fieldLabel("flagText"), options: ["-2", "-1", "0", "1", "2"] },
          { name: "flagBlock", label: fieldLabel("flagBlock"), options: ["-1", "0", "1"] },
          { name: "originalFileType", label: fieldLabel("originalFileType"), options: ["PDF", "XML", "HTML"] },
          { name: "yearFrom", label: fieldLabel("yearFrom"), type: "number" },
          { name: "yearTo", label: fieldLabel("yearTo"), type: "number" },
          { name: "sort", label: fieldLabel("sort"), options: ["sourceIdAsc", "yearDesc", "fileSizeAsc", "providerAsc", "textStatusIssueFirst"] },
        ]}
      />
      <QueryView query={query}>
        {(data) => (
          <>
            {data.items.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{fieldLabel("fileId")}</th>
                      <th>{fieldLabel("sourceId")}</th>
                      <th>{fieldLabel("originalFileType")}</th>
                      <th>{fieldLabel("originalFileName")}</th>
                      <th>{fieldLabel("fileSize")}</th>
                      <th>{fieldLabel("matchedWorkId")}</th>
                      <th>{fieldLabel("flagMatch")}</th>
                      <th>{fieldLabel("flagText")}</th>
                      <th>{fieldLabel("flagBlock")}</th>
                      <th>{fieldLabel("provider")}</th>
                      <th>{fieldLabel("year")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((file) => (
                      <tr key={file.fileId}>
                        <td>
                          <Link to={`/original-files/${file.fileId}`}>{file.fileId}</Link>
                        </td>
                        <td>
                          <Link to={`/sources/${file.sourceId}`}>{file.sourceId}</Link>
                        </td>
                        <td>
                          <StatusBadge value={file.originalFileType} />
                        </td>
                        <td>{file.originalFileName}</td>
                        <td>{bytes(file.fileSize)}</td>
                        <td>{file.matchedWorkId ? <Link to={`/works/${file.matchedWorkId}`}>{file.matchedWorkId}</Link> : "-"}</td>
                        <td>
                          <StatusBadge value={file.flagMatch} kind="flagMatch" />
                        </td>
                        <td>
                          <StatusBadge value={file.flagText} kind="flagText" />
                        </td>
                        <td>
                          <StatusBadge value={file.flagBlock} kind="flagBlock" />
                        </td>
                        <td>{text(file.provider)}</td>
                        <td>{text(file.year)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            <Pager page={data.page} size={data.size} total={data.total} />
          </>
        )}
      </QueryView>
    </>
  );
}

function OriginalFileDetailPage() {
  const { fileId = "" } = useParams();
  const query = useQuery({ queryKey: ["original-file", fileId], queryFn: () => getJson<OriginalFile>(`/api/original-files/${fileId}`) });
  return (
    <>
      <PageHeader title="原始文件详情" meta={fileId} />
      <QueryView query={query}>
        {(file) => (
          <>
            <OriginalFileSummary file={file} />
            <div className="actions">
              {file.matchedWorkId ? <Link to={`/works/${file.matchedWorkId}`}>查看匹配的论文</Link> : null}
            </div>
            <BlocksReaderPage title="解析后全文" meta={fileId} queryKey={["original-file-blocks", fileId]} path={`/api/original-files/${fileId}/blocks`} />
            <section>
              <h2>文本文件</h2>
              {file.textFiles.length ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{fieldLabel("fileType")}</th>
                        <th>{fieldLabel("fileName")}</th>
                        <th>{fieldLabel("filePath")}</th>
                        <th>{fieldLabel("fileSize")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {file.textFiles.map((textFile) => (
                        <tr key={`${textFile.fileId}-${textFile.fileType}`}>
                          <td>
                            <StatusBadge value={textFile.fileType} />
                          </td>
                          <td>{textFile.fileName}</td>
                          <td>
                            <a href={assetUrl(textFile.fileUrl) ?? undefined} target="_blank" rel="noreferrer">
                              {textFile.filePath}
                            </a>
                          </td>
                          <td>{bytes(textFile.fileSize)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty />
              )}
            </section>
            <OriginalFilePreview file={file} />
          </>
        )}
      </QueryView>
    </>
  );
}

function OriginalFilePreview({ file }: { file: OriginalFile }) {
  const url = assetUrl(file.originalFileUrl);
  if (!url || !canPreviewOriginalFile(file)) return null;
  return (
    <section>
      <h2>原始文件预览</h2>
      <div className="preview-toolbar">
        <StatusBadge value={file.originalFileType} />
        <a href={url} target="_blank" rel="noreferrer">
          {file.originalFileName}
        </a>
      </div>
      <iframe className="file-preview" title={file.originalFileName} src={url} />
    </section>
  );
}

function canPreviewOriginalFile(file: OriginalFile) {
  return file.originalFileType !== "XML";
}

function OriginalFileSummary({ file }: { file: OriginalFile }) {
  return (
    <section className="detail-grid">
      <Field label={fieldLabel("fileId")} value={file.fileId} />
      <Field label={fieldLabel("sourceId")} value={<Link to={`/sources/${file.sourceId}`}>{file.sourceId}</Link>} />
      <Field label={fieldLabel("originalFileType")} value={<StatusBadge value={file.originalFileType} />} />
      <Field label={fieldLabel("originalFileName")} value={file.originalFileName} />
      <Field label={fieldLabel("originalFilePath")} value={<a href={assetUrl(file.originalFileUrl) ?? undefined} target="_blank" rel="noreferrer">{file.originalFilePath}</a>} wide />
      <Field label={fieldLabel("fileSize")} value={bytes(file.fileSize)} />
      <Field label={fieldLabel("paperTitle")} value={file.paperTitle} wide />
      <Field label={fieldLabel("authors")} value={file.authors} wide />
      <Field label={fieldLabel("doi")} value={file.doi} />
      <Field label={fieldLabel("url")} value={file.url} wide />
      <Field label={fieldLabel("provider")} value={file.provider} />
      <Field label={fieldLabel("year")} value={file.year} />
      <Field label={fieldLabel("flagMatch")} value={<StatusBadge value={file.flagMatch} kind="flagMatch" />} />
      <Field label={fieldLabel("matchedWorkId")} value={file.matchedWorkId ? <Link to={`/works/${file.matchedWorkId}`}>{file.matchedWorkId}</Link> : "-"} />
      <Field label={fieldLabel("flagText")} value={<StatusBadge value={file.flagText} kind="flagText" />} />
      <Field label={fieldLabel("flagBlock")} value={<StatusBadge value={file.flagBlock} kind="flagBlock" />} />
    </section>
  );
}

function Field({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "field wide" : "field"}>
      <span>{label}</span>
      <strong>{text(value)}</strong>
    </div>
  );
}

function BlockDetails({ block }: { block: Block }) {
  const rows: [string, React.ReactNode][] = [
    [fieldLabel("blockId"), block.blockId],
    [fieldLabel("imagePath"), block.imagePath],
    [fieldLabel("imageUrl"), block.imageUrl ? <a href={assetUrl(block.imageUrl) ?? undefined} target="_blank" rel="noreferrer">{block.imageUrl}</a> : null],
    [fieldLabel("imageCaption"), block.imageCaption],
    [fieldLabel("imageFootnote"), block.imageFootnote],
    [fieldLabel("tableImagePath"), block.tableImagePath],
    [fieldLabel("tableImageUrl"), block.tableImageUrl ? <a href={assetUrl(block.tableImageUrl) ?? undefined} target="_blank" rel="noreferrer">{block.tableImageUrl}</a> : null],
    [fieldLabel("tableCaption"), block.tableCaption],
    [fieldLabel("tableFootnote"), block.tableFootnote],
    [fieldLabel("equationImagePath"), block.equationImagePath],
    [fieldLabel("equationImageUrl"), block.equationImageUrl ? <a href={assetUrl(block.equationImageUrl) ?? undefined} target="_blank" rel="noreferrer">{block.equationImageUrl}</a> : null],
    [fieldLabel("equationFormat"), block.equationFormat],
    [fieldLabel("footnoteLabel"), block.footnoteLabel],
    [fieldLabel("footnoteText"), block.footnoteText],
    [fieldLabel("references"), block.references?.join("\n")],
    [fieldLabel("pdfBbox"), block.pdfBbox ? JSON.stringify(block.pdfBbox) : null],
  ];
  return (
    <div className="block-detail">
      <pre>{block.blockText}</pre>
      <dl>
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt>{label}</dt>
            <dd>{text(value)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Empty />
    </>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/task-status" replace /> },
      { path: "task-status", element: <TaskStatusPage /> },
      { path: "sources", element: <SourcesPage /> },
      { path: "sources/:sourceId", element: <SourceDetailPage /> },
      { path: "works", element: <WorksPage /> },
      { path: "works/:workId", element: <WorkDetailPage /> },
      { path: "works/:workId/blocks", element: <WorkBlocksPage /> },
      { path: "original-files", element: <OriginalFilesPage /> },
      { path: "original-files/:fileId", element: <OriginalFileDetailPage /> },
      { path: "users", element: <PlaceholderPage title="用户列表" /> },
      { path: "roles", element: <PlaceholderPage title="角色权限" /> },
      { path: "service-status", element: <PlaceholderPage title="服务状态" /> },
      { path: "knowledge-base", element: <PlaceholderPage title="知识库" /> },
      { path: "block-search", element: <PlaceholderPage title="内容块检索" /> },
    ],
  },
]);

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
);
