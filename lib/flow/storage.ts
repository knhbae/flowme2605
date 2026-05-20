'use client';
import { seedBundles } from './seed-flows';import { FlowBundle } from './types';
const K='flow_bundles_v1'; const CK='flow_checks_';
export const getBundles=():FlowBundle[]=>{if(typeof window==='undefined') return seedBundles; const raw=localStorage.getItem(K); if(!raw){localStorage.setItem(K,JSON.stringify(seedBundles)); return seedBundles;} return JSON.parse(raw)};
export const saveBundles=(v:FlowBundle[])=>localStorage.setItem(K,JSON.stringify(v));
export const getChecks=(slug:string)=>JSON.parse(localStorage.getItem(CK+slug)||'{}');
export const saveChecks=(slug:string,v:Record<string,boolean>)=>localStorage.setItem(CK+slug,JSON.stringify(v));
