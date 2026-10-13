export type ConsentAction = { title: string; data: Record<string, unknown> };
export type ConsentCard = { text: string; actions: ConsentAction[] };

export function readConsentCard(content: unknown): ConsentCard | undefined {
  if (typeof content === "string") {
    try { content = JSON.parse(content); } catch { return; }
  }
  if (!content || typeof content !== "object") return;
  const root = content as Record<string, unknown>;
  if (root.type !== "AdaptiveCard") return;
  const texts: string[] = [];
  const actions: ConsentAction[] = [];
  function visit(node: unknown) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== "object") return;
    const item = node as Record<string, unknown>;
    if (item.type === "TextBlock" && typeof item.text === "string") texts.push(item.text);
    if (item.type === "Action.Submit" && typeof item.title === "string" &&
        item.data && typeof item.data === "object" && !Array.isArray(item.data)) {
      const data = item.data as Record<string, unknown>;
      if (data.action === "Allow" || data.action === "Cancel") {
        actions.push({ title: item.title, data });
      }
    }
    for (const key of ["body", "items", "columns", "actions"]) visit(item[key]);
  }
  visit(root);
  if (!texts.some((text) => text.includes("Connect to continue")) ||
      !actions.some((action) => action.data.action === "Allow") ||
      !actions.some((action) => action.data.action === "Cancel")) return;
  return { text: texts.join("\n\n"), actions };
}
