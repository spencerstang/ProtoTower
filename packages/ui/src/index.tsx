import type { ReactNode } from "react";

export function UnavailableState(props: Readonly<{
  title: string;
  description: string;
  action?: ReactNode;
}>): ReactNode {
  return (
    <section className="state-card" role="status" aria-live="polite">
      <p className="eyebrow">Temporarily unavailable</p>
      <h1>{props.title}</h1>
      <p>{props.description}</p>
      {props.action ? <div className="state-action">{props.action}</div> : null}
    </section>
  );
}

export function StatusPill(props: Readonly<{ children: ReactNode }>): ReactNode {
  return <span className="status-pill">{props.children}</span>;
}
