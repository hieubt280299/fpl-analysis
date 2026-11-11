import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MonthKey, Participant } from '@/domain/league';
import { useAdminEmail } from '@/features/auth';
import {
  fetchAllMonths,
  fetchMonth,
  finalizeMonth,
  reopenMonth,
  saveParticipants,
} from '../api/monthRepository';
import type { MonthDoc, MonthSnapshot } from '../model';

export const monthKeys = {
  all: ['months'] as const,
  list: () => [...monthKeys.all, 'list'] as const,
  detail: (monthKey: MonthKey) => [...monthKeys.all, 'detail', monthKey] as const,
};

export function useMonthDoc(monthKey: MonthKey | undefined) {
  return useQuery({
    queryKey: monthKeys.detail(monthKey ?? ''),
    queryFn: () => fetchMonth(monthKey as MonthKey),
    enabled: Boolean(monthKey),
    staleTime: 60_000,
  });
}

export function useSavedMonths() {
  return useQuery({
    queryKey: monthKeys.list(),
    queryFn: fetchAllMonths,
    staleTime: 60_000,
  });
}

function useInvalidateMonths() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: monthKeys.all });
}

export function useSaveParticipants() {
  const adminEmail = useAdminEmail();
  const invalidate = useInvalidateMonths();
  return useMutation({
    mutationFn: (input: {
      monthKey: MonthKey;
      leagueId: number;
      participants: Participant[];
      penaltyFree: Record<number, number>;
    }) => saveParticipants({ ...input, adminEmail: adminEmail() }),
    onSuccess: invalidate,
  });
}

export function useFinalizeMonth() {
  const adminEmail = useAdminEmail();
  const invalidate = useInvalidateMonths();
  return useMutation({
    mutationFn: (input: { month: MonthDoc; snapshot: MonthSnapshot }) =>
      finalizeMonth(input.month, input.snapshot, adminEmail()),
    onSuccess: invalidate,
  });
}

export function useReopenMonth() {
  const adminEmail = useAdminEmail();
  const invalidate = useInvalidateMonths();
  return useMutation({
    mutationFn: (month: MonthDoc) => reopenMonth(month, adminEmail()),
    onSuccess: invalidate,
  });
}
