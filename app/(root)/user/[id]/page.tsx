import { auth } from "@/auth";
import { StartupCardSkeleton } from "@/components/StartupCard";
import UserStartups from "@/components/UserStartups";
import Pagination from "@/components/Pagination";
import {
  AUTHOR_BY_ID_QUERY,
  STARTUPS_BY_AUTHOR_COUNT_QUERY,
} from "@/lib/queries";
import { getTotalPages, parsePage } from "@/lib/pagination";
import { client } from "@/sanity/lib/client";
import { getSafeImageUrl } from "@/lib/image-hosts";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";

const page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) => {
  const id = (await params).id;
  const currentPage = parsePage((await searchParams).page);
  const session = await auth();

  const [user, total] = await Promise.all([
    client.fetch(AUTHOR_BY_ID_QUERY, { id }),
    client.fetch<number>(STARTUPS_BY_AUTHOR_COUNT_QUERY, { id }),
  ]);

  if (!user) return notFound();

  const totalPages = getTotalPages(total);
  const profileImage = getSafeImageUrl(user.image);

  if (currentPage > totalPages && total > 0) {
    notFound();
  }

  return (
    <>
      <section className="profile_container">
        <div className="profile_card">
          <div className="profile_title">
            <h3 className="text-24-black uppercase text-center line-clamp-1">
              {user.name ?? "Unknown author"}
            </h3>
          </div>

          {profileImage ? (
            <Image
              src={profileImage}
              alt={user.name ?? "Author avatar"}
              width={220}
              height={220}
              className="profile_image"
            />
          ) : (
            <div
              className="profile_image size-[220px] bg-primary-100"
              aria-hidden="true"
            />
          )}

          <p className="text-30-extrabold mt-7 text-center">
            @{user.username ?? "unknown"}
          </p>
          <p className="mt-1 text-center text-14-normal">{user.bio}</p>
        </div>

        <div className="flex-1 flex flex-col gap-5 lg:-mt-5">
          <p className="text-30-bold">
            {session?.id === id ? "Your" : "All"} Startups
          </p>

          <ul className="card_grid-sm">
            <Suspense fallback={<StartupCardSkeleton />}>
              <UserStartups id={id} page={currentPage} />
            </Suspense>
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            basePath={`/user/${id}`}
          />
        </div>
      </section>
    </>
  );
};

export default page;
