import StartupCard, { StartupTypeCard } from "@/components/StartupCard";
import SearchForm from "@/components/SearchForm";
import Pagination from "@/components/Pagination";
import {
  STARTUPS_COUNT_QUERY,
  STARTUPS_QUERY,
} from "@/lib/queries";
import { getPageRange, getTotalPages, parsePage } from "@/lib/pagination";
import { client } from "@/sanity/lib/client";
import { sanityFetch, SanityLive } from "@/sanity/lib/live";
import { notFound } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string | string[];
    page?: string | string[];
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = Array.isArray(resolvedSearchParams.query)
    ? resolvedSearchParams.query[0]
    : resolvedSearchParams.query;
  const page = parsePage(resolvedSearchParams.page);
  const { start, end } = getPageRange(page);
  const params = { search: query || null, start, end };

  const [{ data }, total] = await Promise.all([
    sanityFetch({ query: STARTUPS_QUERY, params }),
    client.fetch<number>(STARTUPS_COUNT_QUERY, {
      search: query || null,
    }),
  ]);

  const posts = Array.isArray(data) ? (data as StartupTypeCard[]) : [];

  const totalPages = getTotalPages(total);

  if (page > totalPages && total > 0) {
    notFound();
  }

  return (
    <>
      <section className="pink_container">
        <h1 className="heading">
          Pitch Your Startup, <br />
          Connect With Entrepreneurs
        </h1>

        <p className="sub-heading !max-w-3xl">
          Submit Ideas, Connect with Founders, and Get Noticed.
        </p>

        <SearchForm query={query} />
      </section>

      <section className="section_container">
        <p className="text-30-semibold">
          {query ? `Search results for "${query}"` : "All Startups"}
        </p>

        <ul className="mt-7 card_grid">
          {posts.length > 0 ? (
            posts.map((post: StartupTypeCard) => (
              <StartupCard key={post._id} post={post} />
            ))
          ) : (
            <p className="no-results">No startup found</p>
          )}
        </ul>

        <Pagination page={page} totalPages={totalPages} query={query} />
      </section>

      <SanityLive />
    </>
  );
}
