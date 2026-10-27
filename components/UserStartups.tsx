import { STARTUPS_BY_AUTHOR_QUERY } from "@/lib/queries";
import { getPageRange } from "@/lib/pagination";
import { client } from "@/sanity/lib/client";
import StartupCard, { StartupTypeCard } from "./StartupCard";

const UserStartups = async ({ id, page }: { id: string; page: number }) => {
  const { start, end } = getPageRange(page);
  const startups = await client.fetch<StartupTypeCard[]>(
    STARTUPS_BY_AUTHOR_QUERY,
    { id, start, end }
  );

  return (
    <>
      {startups && startups.length > 0 ? (
        startups.map((startup) => (
          <StartupCard key={startup._id} post={startup} />
        ))
      ) : (
        <p className="no-results">No posts yet</p>
      )}
    </>
  );
};

export default UserStartups;
