// Lets scripts run with Node's built-in TypeScript support (`node --import ./scripts/resolve-ts.mjs x.ts`)
// while importing app code written for the Next bundler: resolves the `@/` alias and extensionless
// relative imports. ~20 lines instead of a `tsx` dependency (SPEC §6.2, Decision Log D13).
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const srcDir = new URL("../src/", import.meta.url);
const hasExtension = /\.[cm]?[jt]sx?$|\.json$/;

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith("@/")
      ? new URL(specifier.slice(2), srcDir).href
      : specifier;
    const isPath = target.startsWith(".") || target.startsWith("file:");
    if (isPath && !hasExtension.test(target)) {
      const base = new URL(target, context.parentURL);
      for (const suffix of [".ts", ".tsx", "/index.ts"]) {
        const candidate = new URL(base.href + suffix);
        if (existsSync(fileURLToPath(candidate)))
          return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(target, context);
  },
});
