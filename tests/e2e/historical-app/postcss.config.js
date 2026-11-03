const path = require('node:path');
module.exports = {
  plugins: {
    '@tailwindcss/postcss': { base: path.resolve(__dirname, '../../..') },
    [require.resolve('../../../scripts/tailwind-v3-compat.cjs')]: {},
  },
};
