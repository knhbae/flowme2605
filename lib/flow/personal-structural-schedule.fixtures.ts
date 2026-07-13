import type { PersonalStructuralScheduleState } from './personal-structural-schedule';

export type PersonalStructuralScheduleGoldenFixture = {
  id: string;
  schedule: unknown;
  anchorDate?: string;
  expected: {
    scheduleState: PersonalStructuralScheduleState;
    calendarDate?: string;
    startTime?: string;
    durationMinutes?: number;
    endDate?: string;
    endTime?: string;
    timeZone?: string;
    timeZonePolicy: 'not_applicable' | 'iana' | 'floating_local';
    warningIncludes?: string;
    legacyTimeOnlyMigrated?: boolean;
  };
};

export const personalStructuralScheduleGoldenFixtures: PersonalStructuralScheduleGoldenFixture[] = [
  {
    id: 'unscheduled',
    schedule: undefined,
    expected: {
      scheduleState: 'unscheduled',
      timeZonePolicy: 'not_applicable',
    },
  },
  {
    id: 'all-day',
    schedule: { mode: 'fixed_date', date: '2026-08-03' },
    expected: {
      scheduleState: 'all_day',
      calendarDate: '2026-08-03',
      timeZonePolicy: 'not_applicable',
    },
  },
  {
    id: 'timed-iana',
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-03',
      time: '09:30',
      durationMinutes: 45,
      timeZone: 'Asia/Seoul',
    },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '09:30',
      durationMinutes: 45,
      endDate: '2026-08-03',
      endTime: '10:15',
      timeZone: 'Asia/Seoul',
      timeZonePolicy: 'iana',
    },
  },
  {
    id: 'all-day-to-timed',
    schedule: { mode: 'fixed_date', date: '2026-08-03', time: '13:00' },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '13:00',
      durationMinutes: 30,
      endDate: '2026-08-03',
      endTime: '13:30',
      timeZonePolicy: 'floating_local',
      legacyTimeOnlyMigrated: true,
    },
  },
  {
    id: 'timed-to-all-day',
    schedule: { mode: 'fixed_date', date: '2026-08-03' },
    expected: {
      scheduleState: 'all_day',
      calendarDate: '2026-08-03',
      timeZonePolicy: 'not_applicable',
    },
  },
  {
    id: 'time-edit-stable-identity',
    schedule: { mode: 'fixed_date', date: '2026-08-03', time: '14:20' },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '14:20',
      durationMinutes: 30,
      endDate: '2026-08-03',
      endTime: '14:50',
      timeZonePolicy: 'floating_local',
      legacyTimeOnlyMigrated: true,
    },
  },
  {
    id: 'cross-midnight',
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-03',
      time: '23:50',
      durationMinutes: 30,
    },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '23:50',
      durationMinutes: 30,
      endDate: '2026-08-04',
      endTime: '00:20',
      timeZonePolicy: 'floating_local',
    },
  },
  {
    id: 'invalid-24-hour-time',
    schedule: { mode: 'fixed_date', date: '2026-08-03', time: '24:00' },
    expected: {
      scheduleState: 'all_day',
      calendarDate: '2026-08-03',
      timeZonePolicy: 'not_applicable',
      warningIncludes: 'invalid_time',
    },
  },
  {
    id: 'invalid-duration-falls-back',
    schedule: {
      mode: 'fixed_date',
      date: '2026-08-03',
      time: '10:00',
      durationMinutes: 0,
    },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '10:00',
      durationMinutes: 30,
      endDate: '2026-08-03',
      endTime: '10:30',
      timeZonePolicy: 'floating_local',
      warningIncludes: 'invalid_duration',
    },
  },
  {
    id: 'legacy-fixed-date-time',
    schedule: { mode: 'fixed_date', date: '2026-08-03', time: '08:15' },
    expected: {
      scheduleState: 'timed',
      calendarDate: '2026-08-03',
      startTime: '08:15',
      durationMinutes: 30,
      endDate: '2026-08-03',
      endTime: '08:45',
      timeZonePolicy: 'floating_local',
      legacyTimeOnlyMigrated: true,
    },
  },
];
