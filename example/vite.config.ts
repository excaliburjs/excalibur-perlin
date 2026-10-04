import * as path from 'path';

export default {
  resolve: {
    alias: { '@excalibur-perlin': path.join(__dirname, '../src/index.ts') }
  },
  server: {
    fs: {
      allow: [path.join(__dirname, '..')]
    }
  }
};
