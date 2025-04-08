import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const config = [
  {
    input: 'src/dereference-json-schema/main.ts',
    output: {
      esModule: true,
      file: 'dist/dereference-json-schema.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
  },
  {
    input: 'src/get-chart-details/main.ts',
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
