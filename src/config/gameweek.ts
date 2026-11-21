/**
 * Current GW page settings and the FPL squad rules it relies on.
 */

/** Allowed number of players per position in a starting XI (FPL rules). Keys: element_type. */
export const FORMATION_LIMITS = {
  1: { min: 1, max: 1 },
  2: { min: 3, max: 5 },
  3: { min: 2, max: 5 },
  4: { min: 1, max: 3 },
} as const;

/** Differentials and threats shown per manager. */
export const IMPORTANCE_LIST_SIZE = 3;

/** Rows per page in the ownership matrix. */
export const MATRIX_PAGE_SIZE = 20;
