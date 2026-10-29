export interface ReadonlySemantic {kind:'date'|'scope'|'task'|'subcheck'|'property'|'heading';label:string;title:string;depth:number;reference:boolean;scopeKind:'folder'|'flow'|null;date:string|null;dateValid:boolean|null;checked:boolean|null;currentPercent:number|null;presentation:{bodyFrom:number;bodyTo:number}|null}
export interface Line {id:string;raw:string;kind:string;entityId:string|null;editableReason:string|null;task:null|{title:string;exactToken:string|null;currentPercent:number|null;latestRecorded:unknown;history:unknown[]};semantic?:ReadonlySemantic|null}
export interface Projection {schema:string;documents:{id:string;title:string;source:string;rows:Line[]}[]}
export interface Proposal {readonly ok:true;readonly schema:string;readonly changed:boolean;readonly snapshot:unknown}
export interface CodecDraft {ok:true;view():Projection;roundTrip():unknown;prepare(operation?:unknown):Proposal|{ok:false;reason:string;preservedInput:unknown;unchangedSnapshot:unknown}}
export interface Codec {open(input:unknown):CodecDraft|{ok:false;reason:string;preservedInput:unknown};inspectProposal(proposal:unknown):unknown}
export function createV11Codec(model:unknown):Codec;
export function canonical(value:unknown):string;
