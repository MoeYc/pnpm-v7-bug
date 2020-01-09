import Config from 'webpack-chain';
import { IConfig } from '@umijs/types';
import { deepmerge } from '@umijs/utils';

interface IOpts {
  webpackConfig: Config;
  config: IConfig;
  isDev: boolean;
}

interface ICreateCSSRuleOpts extends IOpts {
  lang: string;
  test: RegExp;
  loader?: string;
  options?: object;
}

function createCSSRule({
  webpackConfig,
  config,
  lang,
  test,
  isDev,
  loader,
  options,
}: ICreateCSSRuleOpts) {
  const rule = webpackConfig.module.rule(lang).test(test);

  applyLoaders(rule.oneOf('css-modules').resourceQuery(/modules/), true);
  applyLoaders(rule.oneOf('css'), false);

  function applyLoaders(rule: Config.Rule<Config.Rule>, isCSSModules: boolean) {
    if (config.styleLoader) {
      rule
        .use('style-loader')
        .loader(require.resolve('style-loader'))
        .options(
          deepmerge(
            {
              base: 0,
            },
            config.styleLoader,
          ),
        );
    } else {
      rule
        .use('extract-css-loader')
        .loader(require.resolve('mini-css-extract-plugin/dist/loader'))
        .options({
          publicPath: './',
          hmr: isDev,
        });
    }

    rule
      .use('css-loader')
      .loader(require.resolve('css-loader'))
      .options({
        importLoaders: 1,
        sourceMap: false,
        ...(isCSSModules
          ? {
              modules: {
                localIdentName: '[local]___[hash:base64:5]',
              },
            }
          : {}),
      });

    if (loader) {
      rule
        .use(loader)
        .loader(require.resolve(loader))
        .options(options || {});
    }
  }
}

export default function({ config, webpackConfig, isDev }: IOpts) {
  // css
  createCSSRule({
    webpackConfig,
    config,
    isDev,
    lang: 'css',
    test: /\.(css)(\?.*)?$/,
  });

  // less
  const theme = config.theme;
  createCSSRule({
    webpackConfig,
    config,
    isDev,
    lang: 'less',
    test: /\.(less)(\?.*)?$/,
    loader: 'less-loader',
    options: {
      modifyVars: theme,
      javascriptEnabled: true,
    },
  });

  // extract css
  if (!config.styleLoader) {
    const hash = !isDev && config.hash ? '.[contenthash:8]' : '';
    webpackConfig
      .plugin('extract-css')
      .use(require.resolve('mini-css-extract-plugin'), [
        {
          filename: `[name]${hash}.css`,
          chunkFilename: `[name]${hash}.chunk.css`,
        },
      ]);
  }
}
