import { PLAYLIST_BY_SLUG_QUERY, STARTUP_BY_ID_QUERY } from "@/lib/queries";
import { formateDate } from "@/lib/utils";
import { client } from "@/sanity/lib/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import markdownit from "markdown-it";
import { Skeleton } from "@/components/ui/skeleton";
import View from "@/components/View";
import StartupCard, { StartupTypeCard } from "@/components/StartupCard";
import { getSafeImageUrl } from "@/lib/image-hosts";

const md = markdownit();

const page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;

  const [post, playlist] = await Promise.all([
    client.fetch<StartupTypeCard | null>(STARTUP_BY_ID_QUERY, { id }),
    client.fetch<{ select?: StartupTypeCard[] } | null>(
      PLAYLIST_BY_SLUG_QUERY,
      { slug: "editor-picks" }
    ),
  ]);

  if (!post) return notFound();

  const editorPosts = playlist?.select ?? [];
  const parsedContent = md.render(post.pitch || "");
  const author = post.author;
  const image = getSafeImageUrl(post.image);
  const authorImage = getSafeImageUrl(author?.image);

  return (
    <>
      <section className="pink_container !min-h-[230px]">
        <p className="tag">{formateDate(post._createdAt)}</p>
        <h1 className="heading">{post.title ?? "Untitled startup"}</h1>
        <p className="sub-heading !max-w-5xl">{post.description}</p>
      </section>

      <section className="section_container">
        {image ? (
          <Image
            src={image}
            alt={post.title ?? "Startup image"}
            width={1200}
            height={630}
            priority
            className="w-full h-auto rounded-xl object-cover"
          />
        ) : (
          <div
            className="w-full h-64 rounded-xl bg-primary-100"
            aria-hidden="true"
          />
        )}

        <div className="space-y-5 mt-10 max-w-4xl mx-auto">
          <div className="flex-between gap-5">
            {author?._id ? (
              <Link
                href={`/user/${author._id}`}
                className="flex gap-2 items-center mb-3"
              >
                {authorImage ? (
                  <Image
                    src={authorImage}
                    alt={author.name ?? "Author avatar"}
                    width={64}
                    height={64}
                    className="rounded-full drop-shadow-lg"
                  />
                ) : (
                  <div
                    className="size-16 rounded-full bg-primary-100"
                    aria-hidden="true"
                  />
                )}

                <div>
                  <p className="text-20-medium">
                    {author.name ?? "Unknown author"}
                  </p>
                  <p className="text-16-medium !text-black-300">
                    @{author.username ?? "unknown"}
                  </p>
                </div>
              </Link>
            ) : (
              <p className="text-20-medium">Unknown author</p>
            )}

            <p className="category-tag">{post.category ?? "Uncategorized"}</p>
          </div>

          <h3 className="text-30-bold">Pitch Details</h3>
          {parsedContent ? (
            <article
              className="prose max-w-4xl font-work-sans break-all"
              dangerouslySetInnerHTML={{ __html: parsedContent }}
            />
          ) : (
            <p className="no-result">No details provided</p>
          )}
        </div>

        <hr className="divider" />

        {editorPosts.length > 0 && (
          <div className="max-w-4xl mx-auto">
            <p className="text-30-semibold ">Editor Picks</p>

            <ul className="mt-7 card_grid-sm">
              {editorPosts.map((editorPost) => (
                <StartupCard key={editorPost._id} post={editorPost} />
              ))}
            </ul>
          </div>
        )}

        <Suspense fallback={<Skeleton className="view_skeleton" />}>
          <View id={id} />
        </Suspense>
      </section>
    </>
  );
};

export default page;
