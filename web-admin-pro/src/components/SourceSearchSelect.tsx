import { Select, Space, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';
import type { OpenAlexSource } from '@/services/business';
import { getOpenAlexSource, searchOpenAlexSources } from '@/services/business';

export default function SourceSearchSelect({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<OpenAlexSource[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value || options.some((item) => item.sourceId === value)) return;
    getOpenAlexSource(value)
      .then((source) => setOptions((current) => [source, ...current]))
      .catch(() => undefined);
  }, [value, options]);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchOpenAlexSources(query)
        .then(setOptions)
        .finally(() => setLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <Select
      value={value}
      disabled={disabled}
      filterOption={false}
      loading={loading}
      onChange={onChange}
      onSearch={setQuery}
      placeholder="输入来源名称、Source ID 或 ISSN"
      showSearch
      options={options.map((source) => ({
        value: source.sourceId,
        label: (
          <Space size={6} wrap>
            <Typography.Text>{source.displayName}</Typography.Text>
            <Tag>{source.sourceId}</Tag>
            {source.issnL ? <Typography.Text type="secondary">ISSN {source.issnL}</Typography.Text> : null}
            {source.publisher ? <Typography.Text type="secondary">{source.publisher}</Typography.Text> : null}
          </Space>
        ),
      }))}
    />
  );
}
