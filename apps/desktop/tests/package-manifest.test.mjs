import assert from "node:assert";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(pkgRoot, "package.json"), "utf8"));

test("package.json names @mayra/desktop", () => {
  assert.strictEqual(pkg.name, "@mayra/desktop");
});

test("scripts.tauri runs the Tauri CLI", () => {
  assert.strictEqual(pkg.scripts?.tauri, "tauri");
});

test("@tauri-apps/cli is a ^2 devDependency", () => {
  const v = pkg.devDependencies?.["@tauri-apps/cli"];
  assert.ok(v, "expected @tauri-apps/cli in devDependencies");
  assert.match(v, /^\^2/);
});
