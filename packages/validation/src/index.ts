import { z } from "zod";

export const nonEmptyTrimmedString = z.string().trim().min(1);
export const uuidSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export function parseUnknown<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  return schema.parse(input);
}

export type ValidationIssue = Readonly<{
  path: readonly PropertyKey[];
  message: string;
}>;

export function validationIssues(error: z.ZodError): readonly ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
}
