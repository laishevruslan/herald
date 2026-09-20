const webpack = require('webpack');
const config = require('./public/local/config.json').config;
const templates = require('./src/assets/local/data/templates.json')['templates'];
const templatesRoutes = templates.map((template) => `/edit/${template.id}`);
const path = require('path');

const SitemapPlugin = require('sitemap-webpack-plugin').default;
const { FontsPlugin } = require('./web_plugins/fonts');
const CopyPlugin = require('copy-webpack-plugin');

const all_langs = require('./src/assets/langs.json');
// For sitemap only
const langs = all_langs.filter((lang) => config['availableLangs'].indexOf(lang.code) >= 0);

const moment = require('moment');

const today = moment().format('YYYY-MM-DDThh:mm:ss');

const withoutLang = [
    { path: '/' },
    { path: '/colors' },
    { path: '/fonts' },
    { path: '/backgrounds' },
    { path: '/symbols' },
    { path: '/qrcode' },
    { path: '/edit' },
].concat(templatesRoutes.map((path) => ({ path: path })));

let paths = [];
paths = paths.concat(
    withoutLang.map((path) => {
        return { path: path.path };
    }),
);

for (const lang of langs) {
    paths = paths.concat(
        withoutLang.map((path) => {
            return { path: '/' + lang.code + path.path };
        }),
    );
}

const plugins = [
    new webpack.DefinePlugin({
        BUILD_UPDATE: JSON.stringify(today),
    }),
    new SitemapPlugin({
        base: config.url,
        paths: paths,
        options: {
            filename: 'sitemap.xml',
            lastmod: true,
        },
    }),
    new FontsPlugin({
        fonts: require('./public/local/data/fonts.json'),
        outputFile: 'fonts/fonts.css',
        aktivisda: require('./package.json').version,
    }),
    new CopyPlugin({
        patterns: [
            {
                from: './node_modules/@neslinesli93/mozjpeg-wasm/lib/mozjpeg-wasm.wasm',
                to: './js/mozjpeg_wasm.wasm',
            },
            {
                from: './node_modules/aktivisda-library/lib/compress/converters/oxipng/oxipng_bg.wasm',
                to: './js/oxipng.wasm',
            },
        ],
        options: {},
    }),
];

module.exports = {
    publicPath: process.env.VUE_APP_NAME === 'aktivisda' ? '/' : '/backtivisda/',
    outputDir: `dist/${process.env.VUE_APP_NAME}`,
    chainWebpack: (config) => {
        config.plugin('html').tap((args) => {
            args[0].title = config.name;
            return args;
        });

        if (process.env.VUE_APP_NAME === 'backtivisda') {
            config.plugin('copy').tap((options) => {
                options[0].patterns[0].globOptions.ignore.push('static/backgrounds/**/*');
                options[0].patterns[0].globOptions.ignore.push('static/symbols/**/*');
                options[0].patterns[0].globOptions.ignore.push('static/templates/**/*');
                return options;
            });
        }

        config.module
            .rule('vue')
            .use('vue-loader')
            .loader('vue-loader')
            .tap((options) => {
                options.hotReload = false;
                return options;
            });

        config.module
            .rule('svgz')
            .test(/\.svgz$/)
            .use('file-loader')
            .loader('file-loader')
            .options({ name: 'img/[name].[ext]' })
            .end();
    },
    configureWebpack: {
        plugins,
        resolve: {
            alias: {
                '@datastore': path.resolve('src', process.env.VUE_APP_NAME, 'datastore.js'),
                '@navbar': path.resolve('src', process.env.VUE_APP_NAME, 'components', 'navbar.vue'),
            },
        },
    },
};
