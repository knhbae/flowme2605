import type {NativeCreatorDocumentOwner} from './native-creator-document-contract';
import {parseAuthoringRecurrenceRule,resolveAuthoringScheduleDate} from './native-creator-vendor/text-authoring/recurrence';
import type {AuthoringRecurrenceRule} from './native-creator-vendor/text-authoring/types';
import {applyNativeCreatorAbsences} from './native-creator-absence';
import {projectNativeSourceRecurrences} from './creator-native-source-update-recurrence';

/** The stored DTO retains typed source facts. Execution consumes the explicit
 * effective projection, so a kept absence cannot revive recurrence or schedule. */
export const programNativeExecutionDocument=(owner:NativeCreatorDocumentOwner)=>{
 const effective=applyNativeCreatorAbsences(owner.document,owner.effectiveAbsences,true);
 return owner.sourceRecurrences?projectNativeSourceRecurrences(effective,owner.sourceRecurrences):effective;
};
type NativeItem=NativeCreatorDocumentOwner['document']['parseResult']['canonical']['items'][number];
const property=(item:NativeItem,key:string)=>[...item.properties].reverse().find(p=>p.key===key)?.value.trim()||undefined;
/** Same canonical recurrence precedence as D2 artifact-projection.canonicalRecurrenceRule.
 * set_property(repeat) is a real native edit, but does not populate item.recurrence.
 * Parsing that typed property is not a reconstruction/reparse of the document. */
export function programNativeExecutionItemFacts(item:NativeItem,anchor?:string|null){
 const raw=property(item,'repeat')??item.schedule?.repeat;
 let rule:AuthoringRecurrenceRule|null=item.recurrence??null;
 if(!rule&&raw){const parsed=parseAuthoringRecurrenceRule({raw,repeatEnd:property(item,'repeat_end')??property(item,'recurrence_end'),executionCondition:property(item,'condition')??property(item,'execution_condition'),sourceRowIds:item.sourceRowIds});if(parsed.ok)rule=parsed.rule;}
 const recurrenceIntent=!!item.recurrence||!!raw&&!/^(?:반복\s*)?(?:없음|안\s*함|하지\s*않음|none)$/iu.test(raw.trim());
 // D2's resolver accepts the anchor on the schedule. Never edit the source DTO/raw.
 const schedule=item.schedule?.kind==='relative'&&anchor?{...item.schedule,anchorLabel:anchor}:item.schedule;
 return{kind:item.role!=='item'?'note' as const:recurrenceIntent?'series' as const:'ordinary' as const,
  date:resolveAuthoringScheduleDate(schedule)??null,time:item.schedule?.time??property(item,'time')??null,timeZone:item.schedule?.timezone??property(item,'timezone')??null,
  rule,recurrenceIntent,recurrenceInvalid:recurrenceIntent&&!rule};
}
