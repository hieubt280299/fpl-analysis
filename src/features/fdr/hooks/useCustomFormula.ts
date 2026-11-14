import { useCallback, useState } from 'react';
import { parseCustomFormula, type CustomFormula } from '../model';

const STORAGE_KEY = 'fpl-analysis:my-fdr-formula';

function load(): CustomFormula | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? parseCustomFormula(JSON.parse(raw)) : null;
  } catch {
    return null; // storage blocked or broken value: just use the shared formula
  }
}

function save(value: CustomFormula | null): void {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode etc.): the formula still works until the page reloads.
  }
}

/**
 * A guest's own FDR formula for this browser tab only (session storage — gone when the tab
 * closes). null = use the shared formula.
 */
export function useCustomFormula() {
  const [custom, setCustomState] = useState<CustomFormula | null>(load);

  const setCustom = useCallback((value: CustomFormula | null) => {
    setCustomState(value);
    save(value);
  }, []);

  const reset = useCallback(() => setCustom(null), [setCustom]);

  return { custom, setCustom, reset };
}
