import * as path from 'path';

export default {
  resolve: {
    alias: { '@excalibur-perlin': path.join(import.meta.dirname, '../src/index.ts') }
  },
  server: {
    fs: {
      allow: [path.join(import.meta.dirname, '..')]
    }
  }
};
