import { PageContainer } from '@ant-design/pro-components';
import { Card, Typography } from 'antd';
import { useLocation } from '@umijs/max';

const pageTitles: Record<string, string> = {
  '/task-status': '工作台',
  '/users': '用户管理',
  '/roles': '角色管理',
  '/service-status': '服务状态',
  '/knowledge-base': '知识库',
  '/block-search': '块搜索',
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? 'PaperFlow Admin';

  return (
    <PageContainer title={title}>
      <Card>
        <Typography.Text type="secondary">待接入业务接口</Typography.Text>
      </Card>
    </PageContainer>
  );
}
