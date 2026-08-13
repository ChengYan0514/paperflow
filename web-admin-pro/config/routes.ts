export default [
  {
    path: '/login',
    layout: false,
    component: './Login',
  },
  {
    path: '/',
    redirect: '/task-status',
  },
  {
    path: '/task-status',
    name: '工作台',
    icon: 'dashboard',
    component: './TaskStatus',
  },
  {
    key: 'literature',
    name: '文献资源',
    icon: 'read',
    routes: [
      {
        path: '/sources',
        name: '来源管理',
        component: './Sources',
      },
      {
        path: '/source-search',
        name: 'OpenAlex 来源检索',
        component: './SourceSearch',
      },
      {
        path: '/sources/:sourceId',
        name: '来源详情',
        hideInMenu: true,
        component: './SourceDetail',
      },
      {
        path: '/papers',
        name: '论文管理',
        component: './Papers',
      },
      {
        path: '/papers/new',
        name: '导入论文',
        hideInMenu: true,
        component: './PaperForm',
      },
      {
        path: '/papers/import',
        name: '批量导入全文',
        access: 'canWritePapers',
        component: './OriginalFileImport',
      },
      {
        path: '/papers/trash',
        name: '论文回收站',
        hideInMenu: true,
        access: 'canDeletePapers',
        component: './PaperTrash',
      },
      {
        path: '/papers/:fileId/edit',
        name: '编辑论文',
        hideInMenu: true,
        component: './PaperForm',
      },
      {
        path: '/papers/:fileId',
        name: '论文详情',
        hideInMenu: true,
        component: './PaperDetail',
      },
      {
        path: '/papers/:fileId/blocks',
        name: '论文全文',
        hideInMenu: true,
        component: './PaperBlocks',
      },
    ],
  },
  {
    key: 'system',
    name: '系统管理',
    icon: 'setting',
    access: 'canManageUsers',
    routes: [
      {
        path: '/users',
        name: '用户管理',
        access: 'canManageUsers',
        component: './Users',
      },
      {
        path: '/roles',
        name: '角色管理',
        access: 'canViewRoles',
        component: './Roles',
      },
      {
        path: '/audit-logs',
        name: '操作审计',
        access: 'canViewAuditLogs',
        component: './AuditLogs',
      },
    ],
  },
  {
    key: 'service',
    name: '服务管理',
    icon: 'cloudServer',
    routes: [
      {
        path: '/service-status',
        name: '服务状态',
        component: './ServiceStatus',
      },
      {
        path: '/failure-tasks',
        name: '失败任务',
        component: './FailureTasks',
      },
      {
        path: '/swagger-ui/index.html',
        name: 'Swagger',
        target: '_blank',
      },
    ],
  },
  {
    key: 'knowledge',
    name: '知识管理',
    icon: 'database',
    routes: [
      {
        path: '/knowledge/causal-graph',
        name: '因果知识图谱',
        component: './Knowledge/CausalGraph/Overview',
      },
      {
        path: '/knowledge/causal-graph/nodes/:variable',
        name: '变量详情',
        hideInMenu: true,
        component: './Knowledge/CausalGraph/NodeDetail',
      },
      {
        path: '/knowledge/causal-graph/edges',
        name: '关系详情',
        hideInMenu: true,
        component: './Knowledge/CausalGraph/EdgeDetail',
      },
      {
        path: '/knowledge/causal-graph/causal-claims/:workId',
        name: '论文因果声明',
        hideInMenu: true,
        component: './Knowledge/CausalGraph/PaperClaims',
      },
      {
        path: '/knowledge/causal-graph/fields',
        name: '领域分析',
        component: './Knowledge/CausalGraph/Fields',
      },
    ],
  },
  {
    path: '*',
    redirect: '/task-status',
  },
];
