import eslint from '@eslint/js';
import tseslint from "typescript-eslint";


export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			semi: ['error', 'never'],
			curly: ['error'],
			"@typescript-eslint/unified-signatures": "off",
			"@typescript-eslint/restrict-template-expressions": ["error", {
				allowNumber: true,
				allowAny: false,
				allowBoolean: false,
				allowNullish: false,
				allowRegExp: false,
				allowNever: false,
			}],
		}
	},
)
