import { z } from "zod";

export const principalIdSchema = z.uuid().brand<"PrincipalId">();
export type PrincipalId = z.infer<typeof principalIdSchema>;

export const emailAddressSchema = z
  .email()
  .max(254)
  .transform((value) => value.trim().toLocaleLowerCase("en-US"))
  .brand<"EmailAddress">();
export type EmailAddress = z.infer<typeof emailAddressSchema>;

export type AnonymousPrincipal = Readonly<{ kind: "anonymous" }>;
export type AuthenticatedPrincipal = Readonly<{
  kind: "authenticated";
  id: PrincipalId;
}>;
export type Principal = AnonymousPrincipal | AuthenticatedPrincipal;

export type AuthorizationReason = "anonymous" | "owner" | "owner_mismatch" | "no_reviewed_policy";

export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  reason: AuthorizationReason;
}>;

export interface AuthorizationPolicy<TContext = unknown> {
  evaluate(context: TContext): AuthorizationDecision;
}

export const denyByDefault: AuthorizationDecision = {
  allowed: false,
  reason: "no_reviewed_policy",
};

export const anonymousPrincipal: AnonymousPrincipal = Object.freeze({ kind: "anonymous" });

export function parseAuthenticatedPrincipal(input: unknown): AuthenticatedPrincipal {
  const value = z.object({ id: principalIdSchema }).strict().parse(input);
  return { kind: "authenticated", id: value.id };
}

export function parseEmailAddress(input: unknown): EmailAddress {
  return emailAddressSchema.parse(input);
}

export function authorizeOwner(principal: Principal, ownerId: PrincipalId): AuthorizationDecision {
  if (principal.kind === "anonymous") {
    return { allowed: false, reason: "anonymous" };
  }

  return principal.id === ownerId
    ? { allowed: true, reason: "owner" }
    : { allowed: false, reason: "owner_mismatch" };
}
