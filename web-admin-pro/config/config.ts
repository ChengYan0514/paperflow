import { defineConfig } from '@umijs/max';
import proxy from './proxy';
import routes from './routes';

const umiEnv = process.env.UMI_ENV || 'dev';

export default defineConfig({
  hash: true,
  esbuildMinifyIIFE: true,
  publicPath: '/',
  proxy: proxy[umiEnv as keyof typeof proxy] || proxy.dev,
  routes,
  title: 'PaperFlow Admin',
  ignoreMomentLocale: true,
  model: {},
  initialState: {},
  access: {},
  layout: {
    title: 'PaperFlow Admin',
    locale: false,
  },
  antd: {
    appConfig: {},
    configProvider: {
      variant: 'filled',
    },
  },
  request: {},
  define: {
    'process.env.API_BASE_URL': process.env.API_BASE_URL || '',
  },
});
