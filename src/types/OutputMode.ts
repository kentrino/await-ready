import * as z from "zod";

export const OutputMode = z.enum(["dots", "spinner", "sl", "silent"]);

export type OutputMode = z.infer<typeof OutputMode>;
