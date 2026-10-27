import { client } from "@/sanity/lib/client";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/lib/queries";
import { writeClient } from "@/sanity/lib/write-client";
import type { Author } from "@/sanity/types";
import type { NextAuthConfig } from "next-auth";

type GitHubProfile = {
  id?: number;
  login?: string;
  bio?: string | null;
};

export const authCallbacks = {
  async signIn({ user, profile }) {
    const githubProfile = profile as unknown as GitHubProfile | undefined;
    const githubId = githubProfile?.id;

    if (!githubId) {
      return false;
    }

    const existingUser = await client
      .withConfig({ useCdn: false })
      .fetch<Author | null>(AUTHOR_BY_GITHUB_ID_QUERY, {
        id: githubId,
      });

    if (!existingUser) {
      await writeClient.create({
        _type: "author",
        id: githubId,
        name: user.name ?? "",
        username: githubProfile?.login ?? user.name ?? "",
        email: user.email ?? "",
        image: user.image ?? "",
        bio: githubProfile?.bio ?? "",
      });
    }

    return true;
  },
  async jwt({ token, account, profile }) {
    if (account && profile) {
      const githubProfile = profile as unknown as GitHubProfile;

      if (githubProfile.id) {
        const user = await client
          .withConfig({ useCdn: false })
          .fetch<Author | null>(AUTHOR_BY_GITHUB_ID_QUERY, {
            id: githubProfile.id,
          });

        token.id = user?._id;
      }
    }

    return token;
  },
  async session({ session, token }) {
    session.id = token.id ?? "";
    return session;
  },
} satisfies NonNullable<NextAuthConfig["callbacks"]>;
