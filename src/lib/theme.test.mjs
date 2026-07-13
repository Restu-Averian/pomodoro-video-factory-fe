import assert from "node:assert/strict";
import { getStoredTheme, resolveTheme } from "./theme.js";

assert.equal(resolveTheme("dark", false), "dark");
assert.equal(resolveTheme("light", true), "light");
assert.equal(resolveTheme("system", true), "dark");
assert.equal(resolveTheme("system", false), "light");
assert.equal(getStoredTheme("invalid"), "system");
assert.equal(getStoredTheme("dark"), "dark");

console.log("theme helpers pass");
