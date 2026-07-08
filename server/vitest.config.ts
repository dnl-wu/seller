import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Without this, vitest's default include glob also picks up the
    // compiled *.test.js files under dist/ after a build, running every
    // test twice.
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
