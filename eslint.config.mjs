// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        ignores: ['out/', 'dist/', '**/*.d.ts'],
    },
    {
        rules: {
            '@typescript-eslint/naming-convention': 'off',
            '@typescript-eslint/semi': 'off',
            'curly': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
);
