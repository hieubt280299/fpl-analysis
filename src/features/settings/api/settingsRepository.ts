import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore, requireFirestore } from '@/lib/firebase/client';
import {
  DEFAULT_CALENDAR,
  DEFAULT_FDR,
  DEFAULT_LEAGUE,
  parseCalendarSettings,
  parseFdrSettings,
  parseLeagueSettings,
  parseUpdateMeta,
  type CalendarSettings,
  type FdrSettings,
  type LeagueSettings,
  type StoredFdrSettings,
} from '../model';

const SETTINGS = 'settings';

export async function fetchLeagueSettings(): Promise<LeagueSettings> {
  if (!firestore) return DEFAULT_LEAGUE;
  const snapshot = await getDoc(doc(firestore, SETTINGS, 'league'));
  return parseLeagueSettings(snapshot.data());
}

export async function saveLeagueSettings(
  settings: LeagueSettings,
  adminEmail: string,
): Promise<void> {
  await setDoc(doc(requireFirestore(), SETTINGS, 'league'), {
    leagueId: settings.leagueId,
    timeZone: settings.timeZone,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}

export async function fetchFdrSettings(): Promise<StoredFdrSettings> {
  if (!firestore) return { ...DEFAULT_FDR, updatedAt: null, updatedBy: null };
  const snapshot = await getDoc(doc(firestore, SETTINGS, 'fdr'));
  const data = snapshot.data();
  return { ...parseFdrSettings(data), ...parseUpdateMeta(data) };
}

export async function saveFdrSettings(settings: FdrSettings, adminEmail: string): Promise<void> {
  // Firestore map keys are strings; team codes are converted back to numbers when parsed.
  const positions = Object.fromEntries(
    Object.entries(settings.lastSeasonPositions).map(([code, pos]) => [String(code), pos]),
  );
  await setDoc(doc(requireFirestore(), SETTINGS, 'fdr'), {
    gameweekWeights: settings.gameweekWeights,
    lastSeasonLabel: settings.lastSeasonLabel.trim(),
    lastSeasonPositions: positions,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}

export async function fetchCalendarSettings(): Promise<CalendarSettings> {
  if (!firestore) return DEFAULT_CALENDAR;
  const snapshot = await getDoc(doc(firestore, SETTINGS, 'calendar'));
  return parseCalendarSettings(snapshot.data());
}

export async function saveCalendarSettings(
  settings: CalendarSettings,
  adminEmail: string,
): Promise<void> {
  await setDoc(doc(requireFirestore(), SETTINGS, 'calendar'), {
    season: settings.season ?? '',
    gameweekMonths: Object.fromEntries(
      Object.entries(settings.gameweekMonths).map(([id, month]) => [String(id), month]),
    ),
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}
