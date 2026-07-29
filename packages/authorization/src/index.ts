export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  reason: string;
}>;

export interface AuthorizationPolicy<TContext = unknown> {
  evaluate(context: TContext): AuthorizationDecision;
}

export const denyByDefault: AuthorizationDecision = {
  allowed: false,
  reason: "No Milestone 1 authorization policy grants access.",
};
