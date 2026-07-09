import type { OriginalFile } from '@/services/business';
import {
  AssetLink,
  bytes,
  DetailGrid,
  fieldLabel,
  OriginalFileLink,
  SourceLink,
  StatusTag,
  WorkLink,
} from './businessUtils';

export function OriginalFileSummary({ file }: { file: OriginalFile }) {
  return (
    <DetailGrid
      items={[
        { label: fieldLabel('fileId'), value: <OriginalFileLink fileId={file.fileId} /> },
        { label: fieldLabel('sourceId'), value: <SourceLink sourceId={file.sourceId} /> },
        { label: fieldLabel('originalFileType'), value: <StatusTag value={file.originalFileType} /> },
        { label: fieldLabel('originalFileName'), value: file.originalFileName },
        {
          label: fieldLabel('originalFilePath'),
          value: <AssetLink url={file.originalFileUrl}>{file.originalFilePath}</AssetLink>,
          span: 2,
        },
        { label: fieldLabel('fileSize'), value: bytes(file.fileSize) },
        { label: fieldLabel('paperTitle'), value: file.paperTitle, span: 2 },
        { label: fieldLabel('authors'), value: file.authors, span: 2 },
        { label: fieldLabel('doi'), value: file.doi },
        { label: fieldLabel('url'), value: file.url, span: 2 },
        { label: fieldLabel('provider'), value: file.provider },
        { label: fieldLabel('year'), value: file.year },
        { label: fieldLabel('flagMatch'), value: <StatusTag kind="flagMatch" value={file.flagMatch} /> },
        {
          label: fieldLabel('matchedWorkId'),
          value: file.matchedWorkId ? <WorkLink workId={file.matchedWorkId} /> : '-',
        },
        { label: fieldLabel('flagText'), value: <StatusTag kind="flagText" value={file.flagText} /> },
        { label: fieldLabel('flagBlock'), value: <StatusTag kind="flagBlock" value={file.flagBlock} /> },
      ]}
    />
  );
}
