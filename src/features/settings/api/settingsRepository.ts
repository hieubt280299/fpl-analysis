import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore, requireFirestore } from '@/lib/firebase/client';
import {
  DEFAULT_FDR,
  DEFAULT_LEAGUE,
  parseFdrSettings,
  parseLeagueSettings,
  type FdrSettings,
  type LeagueSettings,
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

export async function fetchFdrSettings(): Promise<FdrSettings> {
  if (!firestore) return DEFAULT_FDR;
  const snapshot = await getDoc(doc(firestore, SETTINGS, 'fdr'));
  return parseFdrSettings(snapshot.data());
}

export async function saveFdrSettings(settings: FdrSettings, adminEmail: string): Promise<void> {
  // Firestore map keys are strings; team codes are converted back to numbers when parsed.
  const positions = Object.fromEntries(
    Object.entries(settings.lastSeasonPositions).map(([code, pos]) => [String(code), pos]),
  );
  await setDoc(doc(requireFirestore(), SETTINGS, 'fdr'), {
    lastSeasonWeight: settings.lastSeasonWeight,
    lastSeasonLabel: settings.lastSeasonLabel.trim(),
    lastSeasonPositions: positions,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}
