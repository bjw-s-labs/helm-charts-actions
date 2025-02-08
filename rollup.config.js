// See: https://rollupjs.org/introduction/

import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default [
  {
    input: 'src/collect-charts-action.ts',
    output: {
      esModule: true,
      file: 'dist/collect-charts-action.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [commonjs(), nodeResolve(), typescript()]
  },
  {
    input: 'src/dereference-json-schema.ts',
    output: {
      esModule: true,
      file: 'dist/dereference-json-schema.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [commonjs(), nodeResolve(), typescript()]
  },
  {
    input: 'src/schemas.ts',
    output: {
      esModule: true,
      file: 'dist/schemas.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [commonjs(), json(), nodeResolve(), typescript()]
  },
  {
    input: 'src/verify-chart-changelog-action.ts',
    output: {
      esModule: true,
      file: 'dist/verify-chart-changelog-action.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [commonjs(), json(), nodeResolve(), typescript()]
  },
  {
    input: 'src/verify-chart-version-action.ts',
    output: {
      esModule: true,
      file: 'dist/verify-chart-version-action.js',
      format: 'es',
      sourcemap: false
    },
    plugins: [commonjs(), nodeResolve(), typescript()]
  }
]
