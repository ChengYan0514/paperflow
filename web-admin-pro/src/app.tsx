import {
  ModalForm,
  type Settings as LayoutSettings,
} from '@ant-design/pro-components';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history, Link } from '@umijs/max';
import { Button, Dropdown, Form, Input, message } from 'antd';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, isValidElement } from 'react';
import { useState } from 'react';
import type { AuthUser } from '@/services/auth';
import {
  apiBaseUrl,
  changePassword,
  getCurrentUser,
  logout,
} from '@/services/auth';
import defaultSettings from '../config/defaultSettings';

const loginPath = '/login';

function isLoginPath(pathname: string) {
  return pathname === loginPath;
}

function loginUrl() {
  const { pathname, search, hash } = history.location;
  const redirect = encodeURIComponent(`${pathname}${search}${hash}`);
  return `${loginPath}?redirect=${redirect}`;
}

export const request: RequestConfig = {
  baseURL: apiBaseUrl,
  withCredentials: true,
};

function AvatarMenu({ children }: { children: ReactNode }) {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [form] = Form.useForm();

  return (
    <>
      <Dropdown
        menu={{
          items: [
            { key: 'change-password', label: '修改密码' },
            { key: 'logout', label: '退出登录' },
          ],
          onClick: async ({ key }) => {
            if (key === 'change-password') {
              setChangePasswordOpen(true);
            }
            if (key === 'logout') {
              await logout();
              history.replace(loginPath);
            }
          },
        }}
        placement="bottomRight"
      >
        <Button type="text">{children}</Button>
      </Dropdown>
      <ModalForm<{ oldPassword: string; newPassword: string }>
        open={changePasswordOpen}
        title="修改密码"
        form={form}
        layout="vertical"
        modalProps={{ destroyOnHidden: true }}
        onOpenChange={setChangePasswordOpen}
        onFinish={async (values) => {
          await changePassword(values);
          message.success('密码已修改');
          form.resetFields();
          return true;
        }}
      >
        <Form.Item
          label="当前密码"
          name="oldPassword"
          rules={[{ required: true }, { min: 5 }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[{ required: true }, { min: 5 }]}
        >
          <Input.Password />
        </Form.Item>
      </ModalForm>
    </>
  );
}

export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: AuthUser;
}> {
  if (isLoginPath(history.location.pathname)) {
    return {
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }

  try {
    const currentUser = await getCurrentUser();
    return {
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  } catch {
    history.replace(loginUrl());
  }

  return {
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

type MenuLinkItem = {
  children?: MenuLinkItem[];
  hideInMenu?: boolean;
  path?: string;
  target?: string;
};

const topLevelMenuKeys = new Set([
  'literature',
  'system',
  'service',
  'knowledge',
]);

function renderMenuLink(item: MenuLinkItem, dom: ReactNode) {
  if (!item.path || item.children?.length) {
    return dom;
  }

  if (item.target) {
    return (
      <a href={item.path} rel="noreferrer" target={item.target}>
        {dom}
      </a>
    );
  }

  return (
    <Link to={item.path} prefetch>
      {dom}
    </Link>
  );
}

function AccordionMenu({ children }: { children: ReactElement<Record<string, unknown>> }) {
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  return cloneElement(children, {
    openKeys,
    onOpenChange: (nextOpenKeys: string[]) => {
      const nextTopLevelKey = [...nextOpenKeys]
        .reverse()
        .find((key) => topLevelMenuKeys.has(key));

      setOpenKeys((currentOpenKeys) => {
        if (nextTopLevelKey) {
          return [nextTopLevelKey];
        }
        return nextOpenKeys.length === 0 ? [] : currentOpenKeys;
      });
    },
  });
}

export const layout: RunTimeLayoutConfig = ({ initialState }) => {
  return {
    menuItemRender: renderMenuLink,
    menuContentRender: (_, menuDom) =>
      isValidElement(menuDom) ? (
        <AccordionMenu>
          {menuDom as ReactElement<Record<string, unknown>>}
        </AccordionMenu>
      ) : (
        menuDom
      ),
    onPageChange: () => {
      if (!initialState?.currentUser && !isLoginPath(history.location.pathname)) {
        history.replace(loginUrl());
      }
    },
    avatarProps: {
      title:
        initialState?.currentUser?.displayName ||
        initialState?.currentUser?.username,
      render: (_, avatarChildren) => <AvatarMenu>{avatarChildren}</AvatarMenu>,
    },
    ...initialState?.settings,
  };
};
