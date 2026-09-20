const path = require('path')

const resloveSrc = (...paths) => path.join(__dirname, 'src', ...paths)

module.exports = {
  webpack: {
    alias: {
      '@': resloveSrc(),
      '@assets': resloveSrc('assets'),
      '@components': resloveSrc('components'),
      '@common': resloveSrc('common'),
      '@contexts': resloveSrc('contexts'),
      '@hooks': resloveSrc('hooks'),
      '@scenes': resloveSrc('scenes'),
      '@store': resloveSrc('store'),
      '@services': resloveSrc('services'),
      '@utils': resloveSrc('utils'),
      '@handlers': resloveSrc('handlers'),
      // @scenify/sdk was unpublished; resolve to the maintained fork
      '@scenify/sdk': path.resolve(__dirname, 'node_modules/@nkyo/scenify-sdk'),
    },
  },
  devServer: {
    host: '0.0.0.0',
    port: 3004,
    sockPort: 3004,
  },
}
