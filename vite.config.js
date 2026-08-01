/** @type {import('vite').UserConfig} */

import { defineConfig } from "vite"
import { resolve } from "path"

export default defineConfig({
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