import { cn, formateDate } from "../lib/utils";
import { EyeIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { Author, Startup } from "@/sanity/types";
import { getSafeImageUrl } from "@/lib/image-url";
import { Skeleton } from "./ui/skeleton";

export type StartupTypeCard = Omit<Startup, "author"> & { author?: Author };

const StartupCard = ({ post }: { post: StartupTypeCard }) => {
  const {
    _createdAt,
    views,
    author,
    _id,
    title,
    category,
    image,
    description,
  } = post;

  const authorImage = getSafeImageUrl(author?.image);
  const startupImage = getSafeImageUrl(image);

  return (
    <li className="startup-card group">
      <div className="flex-between">
        <p className="startup-card_date">{formateDate(_createdAt)}</p>

        <div className="flex gap-1.5">
          <EyeIcon className="size-6 text-primary" />
          <span className="text-16-medium">{views ?? 0}</span>
        </div>
      </div>

      <div className="flex-between mt-5 gap-5">
        <div className="flex-1">
          {author?._id ? (
            <Link href={`/user/${author._id}`}>
              <p className="text-16-medium line-clamp-1">
                {author.name ?? "Unknown author"}
              </p>
            </Link>
          ) : (
            <p className="text-16-medium line-clamp-1">Unknown author</p>
          )}
          <Link href={`/startup/${_id}`}>
            <h3 className="text-26-semibold line-clamp-1">
              {title ?? "Untitled startup"}
            </h3>
          </Link>
        </div>

        {authorImage && author ? (
          <Link href={`/user/${author._id}`}>
            <Image
              src={authorImage}
              alt={author.name ?? "Author avatar"}
              width={48}
              height={48}
              className="rounded-full"
            />
          </Link>
        ) : (
          <div
            className="size-12 rounded-full bg-primary-100"
            aria-hidden="true"
          />
        )}
      </div>

      <Link href={`/startup/${_id}`}>
        <p className="startup-card_desc">{description}</p>

        {startupImage ? (
          <Image
            src={startupImage}
            alt={title ?? "Startup image"}
            width={600}
            height={400}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="startup-card_img"
          />
        ) : (
          <div
            className="startup-card_img bg-primary-100"
            aria-hidden="true"
          />
        )}
      </Link>

      <div className="flex-between gap-3 mt-5">
        {category ? (
          <Link href={`/?query=${encodeURIComponent(category.toLowerCase())}`}>
            <p className="text-16-medium">{category}</p>
          </Link>
        ) : (
          <p className="text-16-medium">Uncategorized</p>
        )}

        <Button className="startup-card_btn" asChild>
          <Link href={`/startup/${_id}`}>Details</Link>
        </Button>
      </div>
    </li>
  );
};

export const StartupCardSkeleton = () => (
  <>
    {[0, 1, 2, 3, 4].map((i: number) => (
      <li key={cn("skeleton", i)}>
        <Skeleton className="startup-card_skeleton" />
      </li>
    ))}
  </>
);

export default StartupCard;
