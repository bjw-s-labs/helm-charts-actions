import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = [
  {
    input: 'src/dereference-json-schema/index.ts',
    output: {
      esModule: true,
      file: 'dist/dereference-json-schema.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
  },
  {
    input: 'src/get-chart-details/index.ts',
    output: {
      esModule: true,
      file: 'dist/get-chart-details.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
  }
]

export default config
