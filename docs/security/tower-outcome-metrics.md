# Tower outcome metrics

Tower setup stores owner-entered measures, including weight, a 1–5 rating, blood
pressure, a short note, proxy counts or hours, and a final completion value. These
values are private behavioral records. They are not a diagnosis, a treatment record, or
evidence that a protocol worked.

Controls for this slice:

- Only the owning session can read the rows. Row level security is forced.
- Direct table writes are revoked. Create, edit, and check-in go through the reviewed RPCs.
- A private audience stores `named` identity. Choosing shared does not grant another user
  `SELECT`.
- Operational logs record failure codes only. Metric values, notes, and blood pressure
  readings are not logged.
- Account deletion still cascades from `auth.users` through `personal_towers` to protocols,
  metrics, check-ins, responses, and protocol marks.
- The check-in summary repeats the owner's entry. It does not score, streak, or interpret
  the reading.

Removing a metric deletes its stored responses. That deletion is limited to the owner's
tower and is a product limitation of this version, not a cross-user operation.
