import * as z from "zod";

export const Protocol = z.enum(["http", "https", "postgresql", "mysql", "none"]);

export type Protocol = z.infer<typeof Protocol>;
