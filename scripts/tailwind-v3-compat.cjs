/*
 * Official Tailwind 4 removes the vulnerable v3 dependency tree. Preserve only
 * existing space/divide hidden-sibling and physical-edge contracts; do not
 * restructure legacy block/inline wrappers as part of security maintenance.
 * Tests cover both development and optimized production generated shapes.
 */
module.exports = function flowmeV3SiblingCompat() {
  return {
    postcssPlugin: 'flowme-v3-sibling-compat',
    OnceExit(root) {
      root.walkRules((rule) => {
        const match = /^:where\((\.[^\s>]+)\s*>\s*:not\(:last-child\)\)$/.exec(rule.selector);
        if (!match) return;
        const utility = /(?:^\.|\\:)(-?space-[xy]-.+|divide-.+)$/.exec(match[1]);
        if (!utility) return;
        const space = /^-?space-/.test(utility[1]);
        const vertical = /^(?:-?space|divide)-y(?:-|$)/.test(utility[1]);
        const reverse = `--tw-${space ? 'space' : 'divide'}-${vertical ? 'y' : 'x'}-reverse`;
        const declarations = rule.nodes.filter((node) => node.type === 'decl');
        const widthOrSpace = declarations.some((node) => node.prop === reverse);
        const divideColor = !space && declarations.some((node) => node.prop === 'border-color');
        if (!widthOrSpace && !divideColor) return;
        rule.selector = `${match[1]} > :not([hidden]) ~ :not([hidden])`;
        if (!widthOrSpace) return;
        const mapping = space
          ? vertical ? { 'margin-block-start': 'margin-bottom', 'margin-block-end': 'margin-top' }
            : { 'margin-inline-start': 'margin-right', 'margin-inline-end': 'margin-left' }
          : vertical ? { 'border-top-width': 'border-bottom-width', 'border-bottom-width': 'border-top-width' }
            : { 'border-inline-start-width': 'border-right-width', 'border-inline-end-width': 'border-left-width' };
        rule.walkDecls((declaration) => {
          if (mapping[declaration.prop]) declaration.prop = mapping[declaration.prop];
          else if (!space && !vertical && declaration.prop === 'border-inline-style') {
            declaration.prop = 'border-right-style';
            declaration.cloneAfter({ prop: 'border-left-style' });
          }
        });
      });
    },
  };
};
module.exports.postcss = true;
