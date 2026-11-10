'use client';
import { useMemo, useState } from 'react';
import { programCalendarDate } from '@/lib/flow/integrated-poc/date-label';
import { programFolderPath } from '@/lib/flow/integrated-poc/folder-link-suggestions';
import { readTaskLocationFolder, readTaskLocationSource } from '@/lib/flow/integrated-poc/task-location-move';
import type { TextWorkspaceState } from '@/lib/flow/integrated-poc/text-workspace';
import styles from './ProgramTaskMoveSheet.module.css';

export type TaskMoveAvailability = { blocked: boolean; checking: boolean; confirm?: () => void };
export function ProgramTaskMoveSheet(props: { workspace: TextWorkspaceState; documentId: string; taskId: string; today: string;
  availability?: TaskMoveAvailability; disabled?: boolean; onChoose: (folderId: string) => void; onCreate: (title: string) => void }) {
  const [name,setName]=useState(''),[composing,setComposing]=useState(false);
  const source=useMemo(()=>readTaskLocationSource(props.workspace,props.documentId,props.taskId),[props.workspace,props.documentId,props.taskId]);
  const choices=useMemo(()=>props.workspace.folders.map(folder=>({folder,place:readTaskLocationFolder(props.workspace,props.documentId,props.taskId,folder.id,source)})),[props.workspace,props.documentId,props.taskId,source]);
  const disabled=!!props.disabled||!!props.availability?.blocked||!source;
  const day=source?.row.dateLineId ? source.row.groupDate ? programCalendarDate(source.row.groupDate,props.today) : '날짜 미정 구획' : '날짜 머리 없는 구간';
  return <section data-task-move-sheet className={styles.sheet}>
    {props.availability?.blocked&&<div className={styles.warning} role="status"><strong>{props.availability.checking?'저장 확인 뒤 옮길 수 있어요':'저장을 확인하지 못해 옮기기를 잠시 막았습니다'}</strong>
      {props.availability.confirm&&<button type="button" disabled={props.availability.checking} onClick={props.availability.confirm}>{props.availability.checking?'확인 중…':'다시 확인'}</button>}
      <p>옮기기는 두 자리를 함께 바꿉니다. 저장을 확인한 뒤 옮길 수 있습니다.</p></div>}
    <div className={styles.place}><strong>{source?.task.title||'옮길 할 일'}</strong><span>하위 할 일·메모도 같이 갑니다</span><small>옮길 자리: {day}, 고른 폴더의 끝</small></div>
    <div className={styles.choices}>{choices.map(({folder,place})=><button type="button" key={folder.id} disabled={disabled||!!place?.current} onClick={()=>props.onChoose(folder.id)}>
      <span>{programFolderPath(props.workspace,folder.id)||folder.title}</span><small>{place?.current?'지금 여기':folder.id==='folder-unfiled'?'이 구간의 미분류 끝':place?.present?'이 구획에 있음':'구획 끝에 만듦'}</small></button>)}</div>
    <form className={styles.create} onSubmit={event=>{event.preventDefault();if(!disabled&&!composing&&name.trim())props.onCreate(name.trim());}}>
      <label>새 폴더 만들어 옮기기<input value={name} maxLength={100} disabled={disabled} onChange={event=>setName(event.target.value)} onCompositionStart={()=>setComposing(true)} onCompositionEnd={()=>setComposing(false)} /></label>
      <small>새 폴더도 {day} 끝에 생깁니다.</small><button type="submit" disabled={disabled||composing||!name.trim()}>만들고 옮기기</button>
    </form>
  </section>;
}
