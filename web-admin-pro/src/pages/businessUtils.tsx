import { Link } from '@umijs/max';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Tag,
} from 'antd';
import type { TablePaginationConfig } from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { assetUrl, type Page } from '@/services/business';

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
  yearRange: '年份范围',
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
  workIdAsc: '论文 ID 升序',
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

export function valueLabel(value: string | number | boolean | null | undefined) {
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

export function tablePagination<T>(
  page: Page<T>,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
): TablePaginationConfig {
  return {
    current: page.page,
    pageSize: page.size,
    total: page.total,
    showSizeChanger: true,
    showTotal: (total) => `共 ${total} 条`,
    onChange: (current, pageSize) => {
      const next = new URLSearchParams(searchParams);
      const size = pageSize ?? page.size;
      next.set('page', String(size === page.size ? current : 1));
      next.set('size', String(size));
      setSearchParams(next);
    },
  };
}

export type QueryField = {
  name: string;
  type?: 'input' | 'select' | 'yearRange';
  placeholder?: string;
  options?: { label: string; value: string | number | boolean }[];
};

function fieldValue(searchParams: URLSearchParams, field: QueryField) {
  if (field.type === 'yearRange') {
    const yearFrom = searchParams.get('yearFrom');
    const yearTo = searchParams.get('yearTo');
    return yearFrom || yearTo
      ? [yearFrom ? dayjs(yearFrom, 'YYYY') : null, yearTo ? dayjs(yearTo, 'YYYY') : null]
      : undefined;
  }
  return searchParams.get(field.name) ?? undefined;
}

function activeQueryFields(fields: QueryField[], searchParams: URLSearchParams) {
  return fields.filter((field) =>
    field.type === 'yearRange'
      ? searchParams.has('yearFrom') || searchParams.has('yearTo')
      : searchParams.has(field.name),
  );
}

function queryFieldLabel(field: QueryField, searchParams: URLSearchParams) {
  if (field.type === 'yearRange') {
    const from = searchParams.get('yearFrom') ?? '';
    const to = searchParams.get('yearTo') ?? '';
    return `${fieldLabel(field.name)}: ${from || '不限'}-${to || '不限'}`;
  }
  const raw = searchParams.get(field.name);
  const option = field.options?.find((item) => String(item.value) === raw);
  return `${fieldLabel(field.name)}: ${option?.label ?? valueLabel(raw)}`;
}

function removeQueryField(
  field: QueryField,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
) {
  const next = new URLSearchParams(searchParams);
  next.delete('page');
  if (field.type === 'yearRange') {
    next.delete('yearFrom');
    next.delete('yearTo');
  } else {
    next.delete(field.name);
  }
  setSearchParams(next);
}

function queryInput(field: QueryField) {
  if (field.type === 'select') {
    return (
      <Select
        allowClear
        placeholder={field.placeholder ?? `选择${fieldLabel(field.name)}`}
        style={{ width: 180 }}
        options={field.options?.map((option) => ({
          label: option.label,
          value: String(option.value),
        }))}
      />
    );
  }
  if (field.type === 'yearRange') {
    return (
      <DatePicker.RangePicker
        allowEmpty={[true, true]}
        picker="year"
        format="YYYY"
        placeholder={['起始年份', '结束年份']}
        style={{ width: 240 }}
      />
    );
  }
  return (
    <Input
      allowClear
      placeholder={field.placeholder ?? `输入${fieldLabel(field.name)}`}
      style={{ width: 220 }}
    />
  );
}

export function QueryBar({
  primaryField,
  advancedFields,
  sortOptions,
  searchParams,
  setSearchParams,
}: {
  primaryField: QueryField;
  advancedFields?: QueryField[];
  sortOptions?: { label: string; value: string }[];
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
}) {
  const fields = [primaryField, ...(advancedFields ?? []), { name: 'sort', type: 'select' as const }];
  const advanced = advancedFields ?? [];
  const activeFields = activeQueryFields([...advanced, primaryField], searchParams);
  const [advancedOpen, setAdvancedOpen] = useState(activeFields.length > 0);
  const initialValues = Object.fromEntries(
    fields.map((field) => [
      field.name,
      field.name === 'sort' ? (searchParams.get('sort') ?? undefined) : fieldValue(searchParams, field),
    ]),
  );

  return (
    <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
      <Form
        key={searchParams.toString()}
        layout="vertical"
        initialValues={initialValues}
        onFinish={(values) => {
          const next = new URLSearchParams(searchParams);
          next.delete('page');
          for (const field of fields) {
            const value = values[field.name];
            if (field.type === 'yearRange') {
              next.delete('yearFrom');
              next.delete('yearTo');
              const [from, to] = value ?? [];
              if (from) {
                next.set('yearFrom', from.format('YYYY'));
              }
              if (to) {
                next.set('yearTo', to.format('YYYY'));
              }
            } else if (value === undefined || value === null || String(value).trim() === '') {
              next.delete(field.name);
            } else {
              next.set(field.name, String(value).trim());
            }
          }
          setSearchParams(next);
        }}
      >
        <Space wrap align="end" size={12} style={{ width: '100%' }}>
          <Form.Item label={fieldLabel(primaryField.name)} name={primaryField.name} style={{ marginBottom: 0 }}>
            {queryInput(primaryField)}
          </Form.Item>
          <Form.Item label={fieldLabel('sort')} name="sort" style={{ marginBottom: 0 }}>
            <Select
              allowClear
              placeholder="选择排序"
              style={{ width: 180 }}
              options={sortOptions}
            />
          </Form.Item>
          {advanced.length ? (
            <Button onClick={() => setAdvancedOpen((open) => !open)}>
              筛选{activeFields.length ? ` ${activeFields.length}` : ''}
            </Button>
          ) : null}
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit">
              查询
            </Button>
          </Form.Item>
        </Space>
        {advancedOpen ? (
          <div
            style={{
              borderTop: '1px solid #f0f0f0',
              display: 'grid',
              gap: 12,
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              marginTop: 12,
              paddingTop: 12,
            }}
          >
            {advanced.map((field) => (
              <Form.Item key={field.name} label={fieldLabel(field.name)} name={field.name} style={{ marginBottom: 0 }}>
                {queryInput(field)}
              </Form.Item>
            ))}
          </div>
        ) : null}
      </Form>
      {activeFields.length ? (
        <Space wrap size={[8, 8]} style={{ marginTop: 12 }}>
          <span style={{ color: '#6b7280', fontSize: 12 }}>已筛选：</span>
          {activeFields.map((field) => (
            <Tag
              key={field.name}
              closable
              onClose={(event) => {
                event.preventDefault();
                removeQueryField(field, searchParams, setSearchParams);
              }}
            >
              {queryFieldLabel(field, searchParams)}
            </Tag>
          ))}
          <Button type="link" size="small" onClick={() => setSearchParams(new URLSearchParams())}>
            清空
          </Button>
        </Space>
      ) : null}
    </Card>
  );
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
