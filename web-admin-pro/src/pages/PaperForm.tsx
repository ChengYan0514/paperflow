import {
  MinusCircleOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useParams } from '@umijs/max';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Spin,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd';
import { useEffect, useState } from 'react';
import SourceSearchSelect from '@/components/SourceSearchSelect';
import type { PaperMetadataInput } from '@/services/business';
import { createPaper, getPaper, updatePaper } from '@/services/business';

type FormValues = PaperMetadataInput;

type PaperFormContentProps = {
  fileId?: string;
  onCancel?: () => void;
  onSuccess?: (fileId: string) => void;
};

export function PaperFormContent({
  fileId: fileIdProp,
  onCancel,
  onSuccess,
}: PaperFormContentProps) {
  const fileId = fileIdProp;
  const editing = Boolean(fileId);
  const [form] = Form.useForm<FormValues>();
  const [recordVersion, setRecordVersion] = useState(0);
  const [matched, setMatched] = useState(false);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!fileId) return;
    getPaper(fileId)
      .then((paper) => {
        const source = paper.originalFile;
        form.setFieldsValue({
          sourceId: source.sourceId,
          year: source.year || undefined,
          paperTitle: source.paperTitle || '',
          authors: (source.authors || '').split(';').filter(Boolean),
          doi: source.doi || undefined,
          url: source.url || undefined,
          provider: source.provider || undefined,
        });
        setRecordVersion(source.recordVersion || 0);
        setMatched(paper.taskStatus.flagMatch === 1);
      })
      .finally(() => setLoading(false));
  }, [fileId, form]);

  const submit = async (values: FormValues) => {
    if (!editing) {
      const upload = files[0]?.originFileObj;
      if (!upload) {
        message.error('请选择论文全文文件');
        return;
      }
      const created = await createPaper(values, upload as File);
      message.success('论文已导入');
      if (onSuccess) {
        onSuccess(created.fileId);
      } else {
        history.push(`/papers/${created.fileId}`);
      }
      return;
    }
    await updatePaper(fileId as string, values, recordVersion);
    message.success('论文元数据已更新');
    if (onSuccess) {
      onSuccess(fileId as string);
    } else {
      history.push(`/papers/${fileId}`);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form<FormValues>
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ authors: [''] }}
        style={{ maxWidth: 820 }}
      >
        <Form.Item
          name="sourceId"
          label="OpenAlex 来源"
          rules={[{ required: true }]}
        >
          <SourceSearchSelect disabled={matched} />
        </Form.Item>
        <Form.Item name="year" label="发表年份" rules={[{ required: true }]}>
          <InputNumber
            min={1000}
            max={new Date().getFullYear() + 1}
            style={{ width: '100%' }}
            disabled={matched}
          />
        </Form.Item>
        <Form.Item
          name="paperTitle"
          label="论文标题"
          rules={[{ required: true }, { max: 2000 }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 5 }}
            disabled={matched}
          />
        </Form.Item>
        <Form.List name="authors">
          {(fields, { add, remove, move }) => (
            <Form.Item label="作者">
              {fields.map((field, index) => (
                <Space
                  key={field.key}
                  align="baseline"
                  style={{ display: 'flex', marginBottom: 8 }}
                >
                  <Form.Item
                    {...field}
                    rules={[{ required: true, message: '请输入作者姓名' }]}
                    noStyle
                  >
                    <Input
                      placeholder={`作者 ${index + 1}`}
                      disabled={matched}
                    />
                  </Form.Item>
                  {!matched ? (
                    <Button
                      type="text"
                      onClick={() => move(index, Math.max(0, index - 1))}
                    >
                      上移
                    </Button>
                  ) : null}
                  {!matched ? (
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  ) : null}
                </Space>
              ))}
              {!matched ? (
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                >
                  添加作者
                </Button>
              ) : null}
            </Form.Item>
          )}
        </Form.List>
        <Form.Item name="doi" label="DOI">
          <Input disabled={matched} />
        </Form.Item>
        <Form.Item name="url" label="原始文章 URL" rules={[{ type: 'url' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="provider"
          label="Provider（可选）"
          extra="留空时自动继承所选来源的 provider"
        >
          <Input placeholder="例如 Springer、Elsevier" />
        </Form.Item>
        {!editing ? (
          <Form.Item label="论文全文" required>
            <Upload.Dragger
              accept=".pdf,.xml,.html"
              beforeUpload={() => false}
              fileList={files}
              maxCount={1}
              onChange={({ fileList }) => setFiles(fileList.slice(-1))}
            >
              <UploadOutlined style={{ fontSize: 24 }} />
              <div>选择一个 PDF、XML 或 HTML 文件</div>
            </Upload.Dragger>
          </Form.Item>
        ) : null}
        <Space>
          <Button type="primary" htmlType="submit">
            {editing ? '保存修改' : '导入论文'}
          </Button>
          <Button onClick={onCancel ?? (() => history.back())}>取消</Button>
        </Space>
      </Form>
    </Spin>
  );
}

export default function PaperFormPage() {
  const { fileId } = useParams();

  return (
    <PageContainer title={fileId ? '编辑论文' : '导入论文'}>
      <PaperFormContent fileId={fileId} />
    </PageContainer>
  );
}
