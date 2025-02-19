import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

export default [
  {
    input: 'src/dereference-json-schema.ts',
    output: {
      esModule: true,
      file: 'dist/dereference-json-schema.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve(), commonjs()]
  },
  {
    input: 'src/get-chart-details.ts',
    output: {
      esModule: true,
      file: 'dist/get-chart-details.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve(), commonjs()]
  },
]
