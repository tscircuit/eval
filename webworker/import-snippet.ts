import { evalCompiledJs } from "./eval-compiled-js";
import type { ExecutionContext } from "./execution-context";

export async function importSnippet(
  importName: string,
  ctx: ExecutionContext,
  depth = 0
) {
  const { preSuppliedImports } = ctx;
  const fullSnippetName = importName.replace("@tsci/", "").replace(".", "/");

  const { cjs, error } = await globalThis
    .fetch(`${ctx.cjsRegistryUrl}/${fullSnippetName}`)
    .then(async (res) => ({ cjs: await res.text(), error: null }))
    .catch((e) => ({ error: e, cjs: null }));

  if (error) {
    console.error("Error fetching import", importName, error);
    return;
  }

  try {
    if (cjs) {
      const jsonRequireRegex =
        /require\(["']((?:\.\.\/|\.\/)[\w\-.\/]+\.json)["']\)/g;
      const toPrefetch = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = jsonRequireRegex.exec(cjs)) !== null) {
        const relPath = match[1];
        if (relPath.startsWith("./") || relPath.startsWith("../"))
          toPrefetch.add(relPath);
      }

      const resolveRel = (base: string, rel: string) => {
        // base like "author/fake" (no trailing slash)
        const parts = (base + "/" + rel).split("/");
        const out: string[] = [];
        for (const p of parts) {
          if (p === "" || p === ".") continue;
          if (p === "..") out.pop();
          else out.push(p);
        }
        return out.join("/");
      };

      for (const relPath of toPrefetch) {
        const normalized = resolveRel(fullSnippetName, relPath);
        const url = `${ctx.cjsRegistryUrl}/${normalized}`;
        try {
          const res = await globalThis.fetch(url);
          if (res.ok) {
            const json = await res.json();
            preSuppliedImports[normalized] = json;
          }
        } catch (_) {
          // Intentionally ignore fetch errors since prefetching is optional
        }
      }
    }

    const exports = evalCompiledJs(
      cjs!,
      preSuppliedImports,
      fullSnippetName
    ).exports;
    preSuppliedImports[importName] = exports;
  } catch (e) {
    console.error("Error importing snippet", e);
  }
}
