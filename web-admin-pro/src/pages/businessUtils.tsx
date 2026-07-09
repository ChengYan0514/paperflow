import { Link } from '@umijs/max';
import { Descriptions, Empty, Tag } from 'antd';
import type { ReactNode } from 'react';
import { assetUrl } from '@/services/business';

export const fieldLabels: Record<string, string> = {
  sourceId: '来源期刊 ID',
  sourceName: '来源期刊名称',
  provider: '平台',
  workCount: '论文数',
  originalFileCount: '原始文件数',
  matchedFileCount: '已匹配文件数',
  parsedFileCount: '已解析文件数',
  readyFileCount: '就绪文件数',
  parseFailedFileCount: '解析失败文件数',
  blockFailedFileCount: '内容块入库失败文件数',
  unsupportedFileCount: '不支持解析文件数',
  sourceCount: '来源期刊数',
  matchedWorkCount: '匹配成功论文数',
  blockImportedFileCount: '全文入库文件数',
  workId: '论文 ID',
  title: '标题',
  doi: 'DOI',
  publicationYear: '发表年份',
  publicationDate: '发表日期',
  type: '类型',
  language: '语言',
  sourceIds: '来源期刊 ID',
  processingStatus: '匹配文件状态',
  matchedFileId: '匹配文件 ID',
  matchedWorkId: '匹配论文 ID',
  hasOriginalFiles: '有原始文件',
  hasFailures: '有失败',
  stage: '阶段',
  sort: '排序',
  yearFrom: '起始年份',
  yearTo: '结束年份',
  authorId: '作者 ID',
  authorName: '作者姓名',
  authorPosition: '作者位置',
  fileId: '文件 ID',
  originalFileType: '原始文件类型',
  originalFileName: '原始文件名',
  originalFilePath: '原始文件路径',
  fileSize: '文件大小',
  paperTitle: '论文标题',
  authors: '作者',
  url: 'URL',
  year: '年份',
  flagMatch: '匹配状态',
  flagText: '文本解析状态',
  flagBlock: '内容块入库状态',
  fileType: '文件类型',
  fileName: '文件名',
  filePath: '文件路径',
};

const valueLabels: Record<string, string> = {
  NO_MATCHED_FILE: '未匹配原始文件',
  MATCHED: '已匹配',
  PARSING: '解析中',
  PARSE_FAILED: '解析失败',
  UNSUPPORTED_TEXT_INPUT: '不支持解析',
  PARSED: '已解析',
  BLOCK_FAILED: '内容块入库失败',
  READY: '就绪',
  first: '第一作者',
  middle: '中间作者',
  last: '末位作者',
  true: '是',
  false: '否',
  sourceIdAsc: '来源期刊 ID 升序',
  workCountDesc: '论文数降序',
  failureCountDesc: '失败数降序',
  publicationYearDesc: '发表年份降序',
  publicationYearAsc: '发表年份升序',
  titleAsc: '标题升序',
  statusIssueFirst: '异常优先',
  statusReadyFirst: '就绪优先',
  yearDesc: '年份降序',
  fileSizeAsc: '文件大小升序',
  providerAsc: '平台升序',
  textStatusIssueFirst: '解析异常优先',
  originalFileCountDesc: '原始文件数降序',
  matchedProgressAsc: '匹配进度升序',
  parsedProgressAsc: '解析进度升序',
  blockImportedProgressAsc: '入库进度升序',
  abnormalCountDesc: '异常数降序',
  MATCHING: '论文匹配',
  TEXT_PARSING: '文件解析',
  BLOCK_IMPORT: '全文入库',
};

const flagLabels: Record<string, Record<string, string>> = {
  flagMatch: { '-1': '未匹配 (-1)', '0': '未尝试 (0)', '1': '已匹配 (1)' },
  flagText: {
    '-2': '不支持解析 (-2)',
    '-1': '解析失败 (-1)',
    '0': '未解析 (0)',
    '1': '解析中 (1)',
    '2': '解析完成 (2)',
  },
  flagBlock: { '-1': '入库失败 (-1)', '0': '未入库 (0)', '1': '入库完成 (1)' },
};

export function fieldLabel(value: string) {
  return fieldLabels[value] ?? value;
}

export function valueLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return valueLabels[String(value)] ?? String(value);
}

export function display(value: ReactNode) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

export function bytes(value?: number | null) {
  if (value === null || value === undefined) {
    return '-';
  }
  return `${value.toLocaleString()} B`;
}

export function dateText(value?: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-';
}

export function statusLabel(kind: string | undefined, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  return flagLabels[kind ?? '']?.[String(value)] ?? valueLabel(value);
}

export function StatusTag({
  value,
  kind,
}: {
  value: string | number | null | undefined;
  kind?: string;
}) {
  return <Tag>{statusLabel(kind, value)}</Tag>;
}

export function QueryState<T>({
  loading,
  error,
  data,
  children,
}: {
  loading: boolean;
  error?: unknown;
  data?: T;
  children: (data: T) => ReactNode;
}) {
  if (loading) {
    return <div>加载中</div>;
  }
  if (error) {
    return <div role="alert">加载失败</div>;
  }
  if (!data) {
    return <Empty />;
  }
  return <>{children(data)}</>;
}

export function AssetLink({
  url,
  children,
}: {
  url?: string | null;
  children: ReactNode;
}) {
  const href = assetUrl(url);
  return href ? (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <>-</>
  );
}

export function SourceLink({ sourceId }: { sourceId: string }) {
  return <Link to={`/sources/${sourceId}`}>{sourceId}</Link>;
}

export function WorkLink({ workId }: { workId: string }) {
  return <Link to={`/works/${workId}`}>{workId}</Link>;
}

export function OriginalFileLink({ fileId }: { fileId: string }) {
  return <Link to={`/original-files/${fileId}`}>{fileId}</Link>;
}

export function DetailGrid({
  items,
}: {
  items: { label: string; value: ReactNode; span?: number }[];
}) {
  return (
    <Descriptions bordered column={2} size="small">
      {items.map((item) => (
        <Descriptions.Item key={item.label} label={item.label} span={item.span}>
          {display(item.value)}
        </Descriptions.Item>
      ))}
    </Descriptions>
  );
}
