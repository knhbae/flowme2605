// Node's behavioral/SSR tests render real child components; CSS is verified by
// scoped stylesheet checks and the built browser, not parsed as JavaScript.
import { createRequire } from 'node:module';
const testRequire=createRequire(import.meta.url);
testRequire.extensions['.css'] ??= module => { module.exports={__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})}; };
