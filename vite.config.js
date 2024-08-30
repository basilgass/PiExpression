import { defineConfig } from "vite"
import { resolve } from "path"
import dtsPlugin from "vite-plugin-dts"

export default defineConfig({
	minify: false,
	build: {
		lib: {
			name: "PiExpression",
			fileName: "piexpression",
			entry: resolve(__dirname, "src/index.ts"),
			formats: ["es"]
		}
	},
	plugins: [
		dtsPlugin({
			include: ['src', "es2022"],
			outDir: "./types"
		}), // generate .d.ts files for the src folder
	],
	rollupOptions: {
		external: ["vue"],
		output: {
			globals: {
				Vue: "Vue"
			}
		}
		// input: {
		// 	main: resolve(__dirname, "src/index.html"),
		// 	playground: "src/demo/playground.html"
		// }
	}
})