import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath?: string;
  query?: string;
};

function pageHref(
  basePath: string,
  page: number,
  query?: string
): string {
  const params = new URLSearchParams();

  if (query) {
    params.set("query", query);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `${basePath}?${queryString}` : basePath;
}

function visiblePages(page: number, totalPages: number): number[] {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);

  return [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);
}

const Pagination = ({
  page,
  totalPages,
  basePath = "/",
  query,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const pages = visiblePages(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className="mt-10 flex items-center justify-center gap-2"
    >
      {page > 1 ? (
        <Link
          href={pageHref(basePath, page - 1, query)}
          className="rounded-full border-[3px] border-black px-4 py-2 font-semibold"
        >
          Previous
        </Link>
      ) : (
        <span className="rounded-full border-[3px] border-black/20 px-4 py-2 font-semibold text-black/30">
          Previous
        </span>
      )}

      {pages.map((value, index) => {
        const previous = pages[index - 1];
        const hasGap = previous !== undefined && value - previous > 1;

        return (
          <span key={value} className="flex items-center gap-2">
            {hasGap ? <span className="px-1">…</span> : null}
            {value === page ? (
              <span
                aria-current="page"
                className="rounded-full bg-primary px-4 py-2 font-semibold"
              >
                {value}
              </span>
            ) : (
              <Link
                href={pageHref(basePath, value, query)}
                className="rounded-full px-4 py-2 font-semibold hover:bg-primary-100"
              >
                {value}
              </Link>
            )}
          </span>
        );
      })}

      {page < totalPages ? (
        <Link
          href={pageHref(basePath, page + 1, query)}
          className="rounded-full border-[3px] border-black px-4 py-2 font-semibold"
        >
          Next
        </Link>
      ) : (
        <span className="rounded-full border-[3px] border-black/20 px-4 py-2 font-semibold text-black/30">
          Next
        </span>
      )}
    </nav>
  );
};

export default Pagination;
