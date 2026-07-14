import { Tag } from 'antd';
import type { SignCategory } from '@/services/knowledge';

const signMeta: Record<SignCategory, { color: string; label: string }> = {
  positive: { color: 'green', label: '正向' },
  negative: { color: 'red', label: '负向' },
  null: { color: 'default', label: '无显著影响' },
  mixed: { color: 'orange', label: '混合/不确定' },
};

export function signColor(sign?: string | null) {
  if (sign === 'positive') {
    return '#2f8f5b';
  }
  if (sign === 'negative') {
    return '#cf4c3f';
  }
  if (sign === 'null') {
    return '#8c8c8c';
  }
  return '#c9852b';
}

export function SignBadge({ value }: { value?: string | null }) {
  const key = (value || 'mixed') as SignCategory;
  const meta = signMeta[key] ?? signMeta.mixed;
  return <Tag color={meta.color}>{meta.label}</Tag>;
}
