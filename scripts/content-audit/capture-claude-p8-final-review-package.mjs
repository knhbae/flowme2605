process.env.FLOWME_EVIDENCE_PACKAGE_NAME ||= '2026-07-05-claude-design-p8-final-review-package';
process.env.FLOWME_EVIDENCE_REVIEW_CYCLE ||= 'P8';
process.env.FLOWME_EVIDENCE_NEXT_BACKLOG ||= 'P9';
process.env.FLOWME_EVIDENCE_CAPTURE_SCRIPT ||= 'capture-claude-p8-final-review-package.mjs';

await import('./capture-claude-p7-final-review-package.mjs');
