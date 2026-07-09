import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const routes = readFileSync('config/routes.ts', 'utf8');
const dependencies = {
  ...pkg.dependencies,
  ...pkg.devDependencies,
};

assert.equal(pkg.name, 'paperflow-web-admin-pro');

for (const path of [
  '/login',
  '/task-status',
  '/sources',
  '/works',
  '/original-files',
  '/users',
  '/roles',
  '/service-status',
  '/knowledge-base',
  '/block-search',
]) {
  assert.match(routes, new RegExp(`path:\\s*['"]${path}['"]`));
}

for (const name of [
  '工作台',
  '文献资源',
  '系统管理',
  '服务管理',
  '知识管理',
]) {
  assert.match(routes, new RegExp(`name:\\s*['"]${name}['"]`));
}

assert.match(routes, /path:\s*['"]\/swagger-ui\/index\.html['"]/);
assert.match(routes, /target:\s*['"]_blank['"]/);
assert.ok(
  routes.indexOf("name: '服务管理'") <
    routes.indexOf("path: '/swagger-ui/index.html'"),
  'Swagger must live under service management',
);
assert.ok(
  routes.indexOf("path: '/swagger-ui/index.html'") <
    routes.indexOf("name: '知识管理'"),
  'Swagger must not live under system management',
);

for (const path of ['/literature', '/system', '/service', '/knowledge']) {
  assert.doesNotMatch(
    routes,
    new RegExp(`path:\\s*['"]${path}['"]`),
    `${path} must stay a pathless menu group`,
  );
}

assert.ok(!existsSync('mock') || readdirSync('mock').length === 0);

assert.equal(
  dependencies['@tanstack/react-query'],
  undefined,
  'TanStack Query must not be kept in the Umi request migration',
);

for (const path of [
  'config/routes.simple.ts',
  'scripts/simple.js',
  'src/pages/account',
  'src/pages/Admin.tsx',
  'src/pages/chatbot',
  'src/pages/dashboard',
  'src/pages/exception',
  'src/pages/form',
  'src/pages/list',
  'src/pages/profile',
  'src/pages/result',
  'src/pages/table-list',
  'src/pages/user',
  'src/pages/Welcome.tsx',
  'src/pages/Welcome.css',
  'src/pages/Welcome-dark.css',
  'src/components/ArticleListContent',
  'src/components/AvatarList',
  'src/components/HeaderDropdown',
  'src/components/RightContent',
  'src/components/StandardFormRow',
  'src/components/TagSelect',
  'src/services/ant-design-pro',
]) {
  assert.equal(existsSync(path), false, `${path} should be removed`);
}
