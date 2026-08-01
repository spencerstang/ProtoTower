export default function ProtocolCatalogLoading() {
  return (
    <main id="main-content">
      <section className="state-card" role="status" aria-live="polite" aria-busy="true">
        <p className="eyebrow">Read-only catalog</p>
        <h1>Loading protocol building blocks…</h1>
        <p>Checking the latest published versions.</p>
      </section>
    </main>
  );
}
