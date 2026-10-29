import test from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import compat from './tailwind-v3-compat.cjs';

test('generated vertical/horizontal sibling spacing retains hidden-sibling exclusion and physical edges',async()=>{
 const result=await postcss([compat()]).process(':where(.space-y-2 > :not(:last-child)){--tw-space-y-reverse:0;margin-block-start:2px;margin-block-end:0}:where(.space-x-2 > :not(:last-child)){--tw-space-x-reverse:0;margin-inline-start:2px;margin-inline-end:0}',{from:undefined});
 assert(result.css.includes('.space-y-2 > :not([hidden]) ~ :not([hidden])'));assert(result.css.includes('margin-bottom:2px'));assert(result.css.includes('margin-top:0'));assert(result.css.includes('.space-x-2 > :not([hidden]) ~ :not([hidden])'));assert(result.css.includes('margin-right:2px'));assert(result.css.includes('margin-left:0'));
});
test('generated divide rules preserve both physical border sides without touching custom selectors',async()=>{
 const css=':where(.divide-x > :not(:last-child)){--tw-divide-x-reverse:0;border-inline-start-width:1px;border-inline-end-width:0;border-inline-style:solid}.custom > *{margin-inline-start:3px}';
 const result=await postcss([compat()]).process(css,{from:undefined});assert(result.css.includes('border-right-width:1px'));assert(result.css.includes('border-left-width:0'));assert(result.css.includes('border-right-style:solid'));assert(result.css.includes('border-left-style:solid'));assert(result.css.includes('.custom > *{margin-inline-start:3px}'));
});
test('official complete transition-colors keeps immediate focus outline while custom transitions remain unchanged',async()=>{
 const official='color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to',result=await postcss([compat()]).process('.transition-colors{transition-property:'+official+'}.custom{transition-property:outline-color,color}',{from:undefined});
 assert(result.css.includes('.transition-colors{transition-property:'+official.replace('outline-color,','')+'}'));assert(result.css.includes('.custom{transition-property:outline-color,color}'));
});
