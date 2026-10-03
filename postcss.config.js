module.exports = {
  plugins: {
    '@tailwindcss/postcss': { base: __dirname },
    [require.resolve('./scripts/tailwind-v3-compat.cjs')]: {},
  },
};
