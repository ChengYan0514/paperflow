import { Button, Card, Form, Input, message, Typography } from 'antd';
import { history, useModel } from '@umijs/max';
import { login } from '@/services/auth';

function redirectPath() {
  const params = new URLSearchParams(history.location.search);
  return params.get('redirect') || '/task-status';
}

export default function Login() {
  const { setInitialState } = useModel('@@initialState');

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#f5f7fb',
        padding: 24,
      }}
    >
      <Card style={{ width: 'min(100%, 360px)' }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          PaperFlow Admin
        </Typography.Title>
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              const currentUser = await login(values);
              setInitialState((state) => ({ ...state, currentUser }));
              history.push(redirectPath());
            } catch {
              message.error('登录失败，请检查账号和密码');
            }
          }}
        >
          <Form.Item label="账号" name="username">
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password">
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button block htmlType="submit" type="primary">
            登录
          </Button>
        </Form>
      </Card>
    </main>
  );
}
