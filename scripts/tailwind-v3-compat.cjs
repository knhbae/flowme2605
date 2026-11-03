/*
 * Official Tailwind 4 removes the vulnerable v3 dependency tree. Preserve only
 * existing sibling/physical-edge and immediate semantic-focus contracts; do not
 * restructure legacy block/inline wrappers as part of security maintenance.
 * Tests cover both development and optimized production generated shapes.
 */
const defaultTransitionProperties = {
  transition: 'color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events',
  'transition-colors': 'color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to',
};

function preserveImmediateFocus(rule) {
  // A single generated utility class, not a descendant/list/custom selector.
  const selector = /^\.((?:\\.|[\w-])+)(?::(?:hover|focus|focus-visible|focus-within|active|disabled|visited|checked|first-child|last-child|only-child|empty|enabled|target))*$/.exec(rule.selector);
  const utility = selector && /(?:^|\\:)(?:\\!)?(transition(?:-colors)?)(?:\\!)?$/.exec(selector[1]);
  if (!utility) return;
  for (const declaration of rule.nodes.filter((node) => node.type === 'decl' && node.prop === 'transition-property')) {
    const properties = declaration.value.split(',').map((value) => value.trim());
    // Pin the complete official 4.3.3 shape; custom/partial values stay intact.
    if (properties.join(',') !== defaultTransitionProperties[utility[1]]) continue;
    declaration.value = properties.filter((value) => value !== 'outline-color').join(',');
  }
}

module.exports = function flowmeV3SiblingCompat() {
  return {
    postcssPlugin: 'flowme-v3-sibling-compat',
    OnceExit(root) {
      root.walkRules((rule) => {
        preserveImmediateFocus(rule);
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
