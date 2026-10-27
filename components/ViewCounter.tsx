"use client";

import { useEffect, useState } from "react";
import Ping from "./Ping";

const ViewCounter = ({
  id,
  initialViews,
}: {
  id: string;
  initialViews: number;
}) => {
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    const storageKey = `yc-directory:viewed:${id}`;

    try {
      if (sessionStorage.getItem(storageKey)) {
        return;
      }

      sessionStorage.setItem(storageKey, "1");
    } catch {
      // Storage can be unavailable in private or restricted contexts.
    }

    let cancelled = false;

    fetch(`/api/views/${encodeURIComponent(id)}`, { method: "POST" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && typeof data?.views === "number") {
          setViews(data.views);
        }
      })
      .catch(() => {
        // View tracking must never break the page.
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const label = views <= 1 ? "View" : "Views";

  return (
    <div className="view-container">
      <div className="absolute -top-2 -right-2">
        <Ping />
      </div>

      <p className="view-text">
        <span className="font-black">
          {views} {label}
        </span>
      </p>
    </div>
  );
};

export default ViewCounter;
