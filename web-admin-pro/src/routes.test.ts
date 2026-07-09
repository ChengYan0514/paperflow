import { describe, expect, it } from 'vitest';
import routes from '../config/routes';

describe('routes', () => {
  it('keeps top-level menu groups pathless', () => {
    const menuGroups = routes.filter((route) => route.routes?.length);

    expect(menuGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'literature', name: '文献资源' }),
        expect.objectContaining({ key: 'system', name: '系统管理' }),
        expect.objectContaining({ key: 'service', name: '服务管理' }),
        expect.objectContaining({ key: 'knowledge', name: '知识管理' }),
      ]),
    );
    expect(menuGroups.every((route) => !route.path)).toBe(true);
  });

  it('keeps role management under system management', () => {
    const system = routes.find((route) => route.key === 'system');

    expect(system?.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          access: 'canViewRoles',
          component: './Roles',
          name: '角色管理',
          path: '/roles',
        }),
      ]),
    );
  });
});
