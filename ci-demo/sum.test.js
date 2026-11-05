import { test } from "node:test";
import assert from "node:assert";
import { sum } from "./sum.js";

test("adds two numbers", () => {
  assert.strictEqual(sum(2, 3), 5);
});
