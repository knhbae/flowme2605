'use strict';

// The writing-tool switches the editor reads at each use. explicitAddOnly is the older
// single switch: a caller that passes only it still turns all three on together.
module.exports = Object.freeze({ resolve: function (config) {
  const read = name => typeof config[name] === 'function' ? !!config[name]() : null;
  const legacy = () => read('explicitAddOnly') === true;
  const or = (value, fallback) => value === null ? fallback : value;
  return Object.freeze({
    /** Enter inserts one plain line break instead of the list continuation rules. */
    lineBreakEnter: () => or(read('lineBreakEnter'), legacy()),
    /** Typing "- " or "- [ ] " at a line end opens the scope or task picker. */
    typingPickers: () => or(read('typingPickers'), !legacy()),
    /** The row ＋ opens the writing insert menu instead of the default insert action. */
    plusOpensAuthoring: () => or(read('plusOpensAuthoring'), legacy()),
  });
} });
