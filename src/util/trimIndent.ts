function resolve(tsa: TemplateStringsArray, ...placeholders: string[]): string {
  const _placeholders = [...placeholders];
  return tsa.raw.reduce((acc, l) => {
    return acc + l + (_placeholders.shift() ?? "");
  }, "");
}

function getMinCommonIndent(lines: string[]) {
  const res = Math.min(
    ...lines.filter((s) => s.trim()).map((s) => /^\s+/.exec(s)?.[0].length ?? 0),
  );
  if (res === Number.POSITIVE_INFINITY) {
    return 0;
  }
  return res;
}

export function trimIndent(tsa: TemplateStringsArray, ...placeholders: string[]): string {
  const str = resolve(tsa, ...placeholders);
  const lines = str.split("\n");
  const minCommonIndent = getMinCommonIndent(lines);
  const reindented = lines.map((l) => l.slice(minCommonIndent));
  if (!reindented?.find(() => true)?.trim()) {
    reindented.shift();
  }
  if (!reindented?.findLast(() => true)?.trim()) {
    reindented.pop();
  }
  return reindented.join("\n");
}
