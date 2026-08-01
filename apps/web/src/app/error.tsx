"use client";

import { UnavailableState } from "@protostack/ui";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error("ProtoTower route error", {
      name: error.name,
      digest: error.digest,
    });
  }, [error]);

  return (
    <UnavailableState
      title="Something did not load"
      description="No data was changed. Try the request again, or return to the public home page."
      action={
        <button className="primary-action" type="button" onClick={reset}>
          Try again
        </button>
      }
    />
  );
}
