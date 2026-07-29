"use client";

export default function GlobalError({
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <html lang="en">
      <body>
        <main className="state-card">
          <p className="eyebrow">ProtoStack unavailable</p>
          <h1>The application could not start.</h1>
          <p>
            Refresh the page or try again shortly. No personal data was
            submitted by this Milestone 1 page.
          </p>
          <button className="primary-action" type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
