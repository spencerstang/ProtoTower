import { readLocalSupabaseStatus } from "./local-supabase.mjs";

const syntheticUsers = [
  "tower-alpha@example.test",
  "tower-beta@example.test",
  "practice-a11y@example.test",
  "practice-security@example.test",
  "practice-performance@example.test",
];
const resetUsers = [...syntheticUsers, "quiet-launch-new-user@example.test"];

export default async function globalSetup() {
  const status = readLocalSupabaseStatus();
  const headers = {
    apikey: status.serviceRoleKey,
    authorization: `Bearer ${status.serviceRoleKey}`,
    "content-type": "application/json",
  };
  const existingResponse = await fetch(`${status.apiUrl}/auth/v1/admin/users?per_page=1000`, {
    headers,
  });
  if (!existingResponse.ok) {
    throw new Error(`Could not inspect synthetic Auth users (${existingResponse.status}).`);
  }
  const existingBody = await existingResponse.json();
  const existingUsers = Array.isArray(existingBody?.users) ? existingBody.users : [];
  for (const user of existingUsers) {
    if (resetUsers.includes(user?.email) && typeof user?.id === "string") {
      const deleteResponse = await fetch(`${status.apiUrl}/auth/v1/admin/users/${user.id}`, {
        method: "DELETE",
        headers,
      });
      if (!deleteResponse.ok) {
        throw new Error(`Could not reset a synthetic Auth user (${deleteResponse.status}).`);
      }
    }
  }
  for (const email of syntheticUsers) {
    const response = await fetch(`${status.apiUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, email_confirm: true }),
    });
    if (!response.ok) {
      throw new Error(`Could not provision a synthetic Auth user (${response.status}).`);
    }
  }
}
