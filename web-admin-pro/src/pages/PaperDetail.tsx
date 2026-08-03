import {
  ArrowLeftOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  ReadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Link, useParams } from '@umijs/max';
import {
  Button,
  Descriptions,
  Divider,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import type { PaperDetail, TextFile } from '@/services/business';
import { assetUrl, getPaper } from '@/services/business';
import {
  AssetLink,
  bytes,
  fieldLabel,
  QueryState,
  StatusTag,
  valueLabel,
} from './businessUtils';
import './PaperDetail.less';

type ProcessingStep = {
  label: string;
  kind: 'flagMatch' | 'flagText' | 'flagBlock';
  value: number;
};

function ProcessingRail({ data }: { data: PaperDetail }) {
  const steps: ProcessingStep[] = [
    {
      label: '论文匹配',
      kind: 'flagMatch',
      value: data.taskStatus.flagMatch,
    },
    {
      label: '文本解析',
      kind: 'flagText',
      value: data.taskStatus.flagText,
    },
    {
      label: '全文入库',
      kind: 'flagBlock',
      value: data.taskStatus.flagBlock,
    },
  ];

  return (
    <section aria-label="处理进度" className="paper-processing-rail">
      <div className="paper-section-heading">
        <div>
          <span className="paper-eyebrow">Processing record</span>
          <h2>处理链路</h2>
        </div>
        <span className="paper-section-note">状态按处理顺序呈现</span>
      </div>
      <div className="paper-processing-steps">
        {steps.map((step, index) => (
          <div className="paper-processing-step" key={step.kind}>
            <span className="paper-step-index">0{index + 1}</span>
            <div>
              <span className="paper-step-label">{step.label}</span>
              <StatusTag kind={step.kind} value={step.value} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  extra,
}: {
  eyebrow: string;
  title: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="paper-section-heading">
      <div>
        <span className="paper-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {extra}
    </div>
  );
}

export default function PaperDetailPage() {
  const { fileId = '' } = useParams();
  const [file, setFile] = useState<PaperDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getPaper(fileId)
      .then(setFile)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [fileId]);

  return (
    <PageContainer title={false}>
      <QueryState loading={loading} error={error} data={file}>
        {(data) => {
          const { originalFile, openAlex, causalSummary, textFiles } = data;
          const title =
            originalFile.paperTitle || originalFile.originalFileName;

          return (
            <main className="paper-detail-page">
              <section className="paper-hero">
                <div className="paper-hero-topline">
                  <Link className="paper-back-link" to="/papers">
                    <ArrowLeftOutlined /> 返回论文列表
                  </Link>
                  <Tag className="paper-file-type" variant="filled">
                    {originalFile.originalFileType || 'FILE'}
                  </Tag>
                </div>
                <span className="paper-eyebrow">Literature dossier</span>
                <Typography.Title level={1} className="paper-title">
                  {title}
                </Typography.Title>
                <p className="paper-authors">
                  {originalFile.authors || '作者信息暂缺'}
                </p>
                <div className="paper-citation-line">
                  {originalFile.sourceName ? (
                    <span>{originalFile.sourceName}</span>
                  ) : null}
                  {originalFile.year ? <span>{originalFile.year}</span> : null}
                  {originalFile.doi ? (
                    <span>DOI {originalFile.doi}</span>
                  ) : null}
                </div>
                <div className="paper-hero-actions">
                  <Button
                    href={`/papers/${fileId}/blocks`}
                    icon={<ReadOutlined />}
                    type="primary"
                  >
                    查看解析后全文
                  </Button>
                  {assetUrl(originalFile.originalFileUrl) ? (
                    <Button
                      href={assetUrl(originalFile.originalFileUrl) ?? undefined}
                      icon={<FileSearchOutlined />}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {`查看论文全文文件：${originalFile.originalFileName}`}
                    </Button>
                  ) : null}
                  {originalFile.url ? (
                    <Button
                      href={assetUrl(originalFile.url) ?? undefined}
                      icon={<LinkOutlined />}
                      rel="noreferrer"
                      target="_blank"
                      type="text"
                    >
                      访问来源页面
                    </Button>
                  ) : null}
                </div>
              </section>

              <ProcessingRail data={data} />

              <div className="paper-detail-columns">
                <section className="paper-surface paper-record">
                  <SectionHeading eyebrow="File record" title="原始文件档案" />
                  <Descriptions
                    column={{ xs: 1, sm: 2 }}
                    colon={false}
                    size="small"
                  >
                    <Descriptions.Item label={fieldLabel('fileId')}>
                      {originalFile.fileId}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('fileSize')}>
                      {bytes(originalFile.fileSize)}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('sourceName')}>
                      {originalFile.sourceName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('provider')}>
                      {originalFile.provider || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('year')}>
                      {originalFile.year || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('doi')}>
                      {originalFile.doi || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={fieldLabel('originalFileName')}
                      span="filled"
                    >
                      {originalFile.originalFileName}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={fieldLabel('originalFilePath')}
                      span="filled"
                    >
                      {originalFile.originalFilePath}
                    </Descriptions.Item>
                  </Descriptions>
                </section>

                <section className="paper-surface paper-causal-summary">
                  <SectionHeading
                    eyebrow="Knowledge extraction"
                    title="因果声明"
                  />
                  {openAlex && causalSummary?.hasCausalClaims ? (
                    <>
                      <div className="paper-causal-stats">
                        <Statistic
                          title="声明记录"
                          value={causalSummary.claimRecordCount}
                        />
                        <Statistic
                          title="标准变量对"
                          value={causalSummary.standardClaimCount}
                        />
                        <Statistic
                          title="变量数"
                          value={causalSummary.variableCount}
                        />
                      </div>
                      <Button
                        block
                        href={`/knowledge/causal-graph/causal-claims/${openAlex.workId}`}
                        icon={<FolderOpenOutlined />}
                        type="primary"
                      >
                        查看因果声明
                      </Button>
                    </>
                  ) : (
                    <div className="paper-empty-note">
                      {openAlex
                        ? '已匹配 OpenAlex，尚未提取因果声明。'
                        : '尚未匹配 OpenAlex，暂不能关联因果声明。'}
                    </div>
                  )}
                </section>
              </div>

              <section className="paper-surface paper-text-files">
                <SectionHeading
                  eyebrow="Derived assets"
                  title="解析文本文件"
                  extra={
                    <span className="paper-section-note">
                      {textFiles.length} 个可用文件
                    </span>
                  }
                />
                <Table<TextFile>
                  dataSource={textFiles}
                  locale={{ emptyText: '尚未生成解析文本文件' }}
                  pagination={false}
                  rowKey={(textFile) =>
                    `${textFile.fileId}-${textFile.fileType}`
                  }
                  scroll={{ x: 720 }}
                  columns={[
                    {
                      title: fieldLabel('fileType'),
                      dataIndex: 'fileType',
                      width: 120,
                      render: (_, item) => <StatusTag value={item.fileType} />,
                    },
                    {
                      title: fieldLabel('fileName'),
                      dataIndex: 'fileName',
                      width: 220,
                    },
                    {
                      title: fieldLabel('filePath'),
                      dataIndex: 'filePath',
                      render: (_, item) => (
                        <AssetLink url={item.fileUrl}>
                          {item.filePath}
                        </AssetLink>
                      ),
                    },
                    {
                      title: fieldLabel('fileSize'),
                      dataIndex: 'fileSize',
                      width: 120,
                      render: (_, item) => bytes(item.fileSize),
                    },
                  ]}
                />
              </section>

              {openAlex ? (
                <section className="paper-surface paper-openalex">
                  <SectionHeading
                    eyebrow="Matched identity"
                    title="OpenAlex 文献记录"
                    extra={<Tag>{openAlex.workId}</Tag>}
                  />
                  <Descriptions
                    column={{ xs: 1, sm: 2, lg: 3 }}
                    colon={false}
                    size="small"
                  >
                    <Descriptions.Item
                      label={fieldLabel('title')}
                      span="filled"
                    >
                      {openAlex.title || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('doi')}>
                      {openAlex.doi || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('publicationYear')}>
                      {openAlex.publicationYear || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('publicationDate')}>
                      {openAlex.publicationDate || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('type')}>
                      {valueLabel(openAlex.type)}
                    </Descriptions.Item>
                    <Descriptions.Item label={fieldLabel('language')}>
                      {valueLabel(openAlex.language)}
                    </Descriptions.Item>
                  </Descriptions>
                  <Divider />
                  <div className="paper-openalex-tables">
                    <div>
                      <h3>作者</h3>
                      <Table
                        dataSource={openAlex.authors}
                        locale={{ emptyText: '暂无作者记录' }}
                        pagination={false}
                        rowKey="authorId"
                        size="small"
                        columns={[
                          {
                            title: fieldLabel('authorName'),
                            dataIndex: 'authorName',
                          },
                          {
                            title: fieldLabel('authorPosition'),
                            dataIndex: 'authorPosition',
                            width: 100,
                            render: valueLabel,
                          },
                        ]}
                      />
                    </div>
                    <div>
                      <h3>来源期刊</h3>
                      <Table
                        dataSource={openAlex.sources}
                        locale={{ emptyText: '暂无来源记录' }}
                        pagination={false}
                        rowKey="sourceId"
                        size="small"
                        columns={[
                          {
                            title: fieldLabel('sourceName'),
                            dataIndex: 'sourceName',
                          },
                          {
                            title: fieldLabel('provider'),
                            dataIndex: 'provider',
                            width: 110,
                          },
                        ]}
                      />
                    </div>
                  </div>
                </section>
              ) : null}
            </main>
          );
        }}
      </QueryState>
    </PageContainer>
  );
}
