import * as z from "zod";

export const Protocol = z.enum(["http", "https", "pg", "mysql"]);

export type Protocol = z.infer<typeof Protocol>;
