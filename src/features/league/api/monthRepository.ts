import { collection, doc, getDoc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import type { MonthKey, Participant } from '@/domain/league';
import { firestore, requireFirestore } from '@/lib/firebase/client';
import { parseMonthDoc, type MonthDoc, type MonthSnapshot } from '../model';

const MONTHS = 'months';

export async function fetchMonth(monthKey: MonthKey): Promise<MonthDoc | null> {
  if (!firestore) return null;
  const snapshot = await getDoc(doc(firestore, MONTHS, monthKey));
  return parseMonthDoc(monthKey, snapshot.data());
}

/** Every saved month (any season). The collection holds ~10 small docs per season. */
export async function fetchAllMonths(): Promise<MonthDoc[]> {
  if (!firestore) return [];
  const snapshot = await getDocs(collection(firestore, MONTHS));
  return snapshot.docs
    .map((d) => parseMonthDoc(d.id, d.data()))
    .filter((m): m is MonthDoc => m !== null);
}

interface WriteMonthInput {
  monthKey: MonthKey;
  leagueId: number;
  participants: readonly Participant[];
  snapshot: MonthSnapshot | null;
  adminEmail: string;
}

function writeMonth({ monthKey, leagueId, participants, snapshot, adminEmail }: WriteMonthInput) {
  return setDoc(doc(requireFirestore(), MONTHS, monthKey), {
    monthKey,
    leagueId,
    participants: participants.map((p) => ({
      entryId: p.entryId,
      playerName: p.playerName,
      entryName: p.entryName,
    })),
    status: snapshot ? 'finalized' : 'open',
    // JSON round-trip strips `undefined`, which Firestore rejects.
    snapshot: snapshot ? (JSON.parse(JSON.stringify(snapshot)) as MonthSnapshot) : null,
    updatedAt: serverTimestamp(),
    updatedBy: adminEmail,
  });
}

export function saveParticipants(input: Omit<WriteMonthInput, 'snapshot'>): Promise<void> {
  return writeMonth({ ...input, snapshot: null });
}

export function finalizeMonth(month: MonthDoc, snapshot: MonthSnapshot, adminEmail: string) {
  return writeMonth({
    monthKey: month.monthKey,
    leagueId: month.leagueId,
    participants: month.participants,
    snapshot,
    adminEmail,
  });
}

export function reopenMonth(month: MonthDoc, adminEmail: string) {
  return writeMonth({
    monthKey: month.monthKey,
    leagueId: month.leagueId,
    participants: month.participants,
    snapshot: null,
    adminEmail,
  });
}
