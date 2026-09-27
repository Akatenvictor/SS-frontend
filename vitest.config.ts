import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        include: ["**/*.test.{ts,tsx}"],
    },
    oxc: {
        // `jsx` takes an options object; the bare "automatic" string is not a
        // valid value and fails `tsc --noEmit`.
        jsx: { runtime: "automatic" },
    },

    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
});
