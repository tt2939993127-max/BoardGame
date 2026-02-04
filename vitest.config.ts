import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: [
            'src/core/**/__tests__/**/*.test.ts',
            'src/components/**/__tests__/**/*.test.ts',
            'src/lib/**/__tests__/**/*.test.ts',
            'src/games/**/__tests__/**/*.test.ts',
            'src/engine/**/__tests__/**/*.test.ts',
            'src/server/**/__tests__/**/*.test.ts',
            'src/ugc/**/__tests__/**/*.test.ts',
            'apps/api/test/**/*.test.ts',
            'apps/api/test/**/*.e2e-spec.ts',
        ],
        testTimeout: 180000,
        setupFiles: ['./apps/api/test/vitest.setup.ts'],
    },
});
