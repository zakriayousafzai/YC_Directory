export const PAGE_SIZE = 9;

export function parsePage(value?: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);

  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPageRange(page: number, pageSize = PAGE_SIZE) {
  const start = (page - 1) * pageSize;

  return {
    start,
    end: start + pageSize,
  };
}

export function getTotalPages(total: number, pageSize = PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
