import { STARTUP_VIEWS_QUERY } from "@/lib/queries";
import { client } from "@/sanity/lib/client";
import ViewCounter from "./ViewCounter";

const View = async ({ id }: { id: string }) => {
  const post = await client
    .withConfig({ useCdn: false })
    .fetch<{ views: number } | null>(STARTUP_VIEWS_QUERY, { id });

  return <ViewCounter id={id} initialViews={post?.views ?? 0} />;
};

export default View;
