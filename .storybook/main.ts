import type { StorybookConfig } from '@storybook/react-vite';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../packages/ui/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (config) => {
    return {
      ...config,
      esbuild: {
        ...config.esbuild,
        // Ignore 'use client' directives
        banner: {
          js: `"use no-client";`,
        },
      },
      define: {
        ...config.define,
        'process.env.TAILWIND_MODE': '"build"',
        'process.env.NODE_ENV': '"production"',
      },
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          '@entrip/ui': path.resolve(__dirname, '../packages/ui/src'),
          '@entrip/shared': path.resolve(__dirname, '../packages/shared/src'),
          '@entrip/design-tokens': path.resolve(__dirname, '../packages/design-tokens/dist'),
        },
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: ['react', 'react-dom'],
        exclude: ['@entrip/ui', '@entrip/shared'],
      },
      build: {
        ...config.build,
        commonjsOptions: {
          ...config.build?.commonjsOptions,
          transformMixedEsModules: true,
        },
        rollupOptions: {
          ...config.build?.rollupOptions,
          onwarn(warning, warn) {
            // Ignore "use client" warnings
            if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
              return;
            }
            warn(warning);
          },
        },
      },
    };
  },
  staticDirs: ['../public'],
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
  },
};

export default config;