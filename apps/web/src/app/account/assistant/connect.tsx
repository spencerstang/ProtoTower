"use client";
import { useState } from "react";
import { connect } from "./actions";
export function Connect({ active }: { active: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  if (token && active)
    return (
      <div>
        <label htmlFor="assistant-token">Connection key (shown once)</label>
        <input id="assistant-token" readOnly value={token} autoComplete="off" />
        <p>
          Save this in your assistant’s secure Bearer credential setting. Anyone with this key can
          read all your Towers and save measurements.
        </p>
        <button type="button" onClick={() => setToken(null)}>
          Hide key
        </button>
      </div>
    );
  if (active) return null;
  return (
    <form
      action={async () => {
        const key = await connect();
        setToken(key);
        setFailed(!key);
      }}
    >
      <button type="submit">Connect an assistant for 30 days</button>
      {failed && <p role="alert">Connection unavailable. Reload and try again.</p>}
    </form>
  );
}
