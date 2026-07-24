import { InfoCircleOutlined } from '@ant-design/icons';
import { Tooltip, Typography } from 'antd';

export function CausalInferenceMethod({
  method,
  otherDescription,
}: {
  method?: string | null;
  otherDescription?: string | null;
}) {
  const description = otherDescription?.trim();

  return (
    <span>
      {method}
      {method === 'Other' && description ? (
        <Tooltip
          title={
            <div>
              <Typography.Text strong style={{ color: 'inherit' }}>
                方法描述：
              </Typography.Text>
              <div>{description}</div>
            </div>
          }
        >
          <InfoCircleOutlined
            aria-label={`方法描述：${description}`}
            style={{ color: '#1677ff', marginLeft: 8 }}
          />
        </Tooltip>
      ) : null}
    </span>
  );
}
