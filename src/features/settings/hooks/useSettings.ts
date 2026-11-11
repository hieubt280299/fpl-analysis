import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAdminEmail } from '@/features/auth';
import {
  fetchFdrSettings,
  fetchLeagueSettings,
  saveFdrSettings,
  saveLeagueSettings,
} from '../api/settingsRepository';
import type { FdrSettings, LeagueSettings } from '../model';

export const settingsKeys = {
  league: ['settings', 'league'] as const,
  fdr: ['settings', 'fdr'] as const,
};

const FIVE_MINUTES = 5 * 60_000;

export function useLeagueSettings() {
  return useQuery({
    queryKey: settingsKeys.league,
    queryFn: fetchLeagueSettings,
    staleTime: FIVE_MINUTES,
  });
}

export function useFdrSettings() {
  return useQuery({
    queryKey: settingsKeys.fdr,
    queryFn: fetchFdrSettings,
    staleTime: FIVE_MINUTES,
  });
}

export function useSaveLeagueSettings() {
  const queryClient = useQueryClient();
  const adminEmail = useAdminEmail();
  return useMutation({
    mutationFn: (settings: LeagueSettings) => saveLeagueSettings(settings, adminEmail()),
    onSuccess: (_result, settings) => {
      queryClient.setQueryData(settingsKeys.league, settings);
    },
  });
}

export function useSaveFdrSettings() {
  const queryClient = useQueryClient();
  const adminEmail = useAdminEmail();
  return useMutation({
    mutationFn: (settings: FdrSettings) => saveFdrSettings(settings, adminEmail()),
    onSuccess: (_result, settings) => {
      queryClient.setQueryData(settingsKeys.fdr, settings);
    },
  });
}
