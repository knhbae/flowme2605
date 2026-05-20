export const addDays=(date:Date,days:number)=>{const d=new Date(date);d.setDate(d.getDate()+days);return d};
export const formatDate=(date:Date)=>date.toISOString().slice(0,10);
export const getRangeEnd=(start:Date,durationDays:number)=>addDays(start,Math.max(durationDays-1,0));
