import { readLocalSupabaseStatus } from "./local-supabase.mjs";

const syntheticUsers = ["tower-alpha@example.test", "tower-beta@example.test"];
const forbiddenUnknownUser = "unknown-invite@example.test";

export default async function globalTeardown() {
  const status = readLocalSupabaseStatus();
  const headers = {
    apikey: status.serviceRoleKey,
    authorization: `Bearer ${status.serviceRoleKey}`,
  };
  const response = await fetch(`${status.apiUrl}/auth/v1/admin/users?per_page=1000`, { headers });
  if (!response.ok) throw new Error(`Could not verify synthetic Auth users (${response.status}).`);
  const body = await response.json();
  const users = Array.isArray(body?.users) ? body.users : [];
  if (users.some((user) => user?.email === forbiddenUnknownUser)) {
    throw new Error("An unknown address was incorrectly enrolled by the invite-only flow.");
  }
  for (const user of users) {
    if (syntheticUsers.includes(user?.email) && typeof user?.id === "string") {
      const deleteResponse = await fetch(`${status.apiUrl}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) {
        throw new Error(`Could not remove a synthetic Auth user (${deleteResponse.status}).`);
      }
    }
  }
}
