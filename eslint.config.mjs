import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'

export default tseslint.config(
    {
        ignores: [
            'eslint.config.mjs',
            'dist/',
            'node_modules/',
            'prisma.config.ts',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    {
        files: ['**/*.ts', '**/*.js'],
        languageOptions: {
            parserOptions: {
                project: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            '@typescript-eslint/no-floating-promises': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_' },
            ],

            'no-restricted-syntax': [
                'error',
                {
                    // Ищем await, который НЕ находится внутри TryStatement
                    selector:
                        'AwaitExpression:not(TryStatement AwaitExpression)',
                    message: 'КРАШ: await вне try-catch запрещен.',
                },
                {
                    // Ищем JSON.parse, который НЕ находится внутри TryStatement
                    selector:
                        "CallExpression[callee.object.name='JSON'][callee.property.name='parse']:not(TryStatement CallExpression)",
                    message: 'КРАШ: JSON.parse вне try-catch запрещен.',
                },
                {
                    // Ищем функции на Sync, которые НЕ внутри TryStatement
                    selector:
                        'CallExpression[callee.property.name=/.*Sync$/]:not(TryStatement CallExpression), CallExpression[callee.name=/.*Sync$/]:not(TryStatement CallExpression)',
                    message:
                        'КРАШ: Синхронная операция вне try-catch запрещена.',
                },
            ],
        },
    },
    prettierConfig,
)
