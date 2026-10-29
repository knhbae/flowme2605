// Stylesheet guards for the note-layout space rules (UX 6 A1, A5). They pin the rules and
// their cascade order; the rendered layout itself is checked in the browser QA.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=(name:string)=>readFileSync(new URL(`./${name}.module.css`,import.meta.url),'utf8');

test('a closed authoring box is one bottom-ruled row',()=>{
 const space=css('ProgramSpace');
 assert(space.includes('.personalAuthoring:not([open]) { margin: 0 0 8px; padding: 0 12px; border-width: 0 0 1px; border-radius: 0; }'));
});

test('"…" lies over the tab row only when the space directly follows it',()=>{
 const alpha=css('AlphaWorkspace'),space=css('ProgramSpace');
 const overlay='.page[data-note-layout="true"] .workPane:has(> .sync + div > section[data-note-layout="true"]:first-child) > .sync { height: 0; margin-bottom: 0; align-items: flex-start; }';
 assert(alpha.includes(overlay));
 // Later than every rule that gives .sync its own bottom margin, so a keyboard or short viewport cannot restore the line.
 assert(alpha.lastIndexOf('.sync { margin-bottom: 8px; }')<alpha.indexOf(overlay));
 const room='.space[data-note-layout="true"] .contextActions .periods { padding-right: 56px; }';
 assert(space.includes(room));
 assert(space.indexOf('.space[data-note-layout="true"] .contextActions .periods{position:static')<space.indexOf(room));
});

test('an acknowledged publication notice leaves no empty row, and the header badge can reopen it',()=>{
 const alpha=css('AlphaWorkspace'),space=css('ProgramSpace');
 assert(space.includes('.space[data-note-layout="true"] .periodNotice:has(> [hidden]:only-child) { display: none; }'));
 assert(alpha.includes('.page[data-alpha-frame="b"] .header .development > summary {'));
 assert(/\.page\[data-alpha-frame="b"\] \.header \.development > p \{ position: absolute;/.test(alpha));
 assert(alpha.includes('.devNotice > button { flex: 0 0 auto; min-width: 48px; min-height: 48px; }'));
});
