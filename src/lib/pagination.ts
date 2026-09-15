export const DEFAULT_PAGE_SIZE = 20;

/** Parses a `?page=` search param into a safe positive integer, defaulting to 1 for anything
 * missing, non-numeric, or out of range. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function getSkipTake(page: number, pageSize: number = DEFAULT_PAGE_SIZE): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function getTotalPages(totalCount: number, pageSize: number = DEFAULT_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
