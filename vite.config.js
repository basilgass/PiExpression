/// <reference types="vitest/config" />
/** @type {import('vite').UserConfig} */

import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
	test: {
		coverage: {
			provider: "v8",
			include: ["src/**/*.ts"],
			exclude: ["src/index.ts"],
			reporter: ["text", "html"],
			reportsDirectory: "coverage"
		}
	},
	build: {
		lib: {
			name: "PiExpression",
			fileName: "piexpression",
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es"]
		},
		outDir: "dist",
		copyPublicDir: false,
		sourcemap: true,
		emptyOutDir: true,
	},
	plugins: []
})