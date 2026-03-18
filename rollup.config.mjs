import commonjs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

function onwarn(warning, warn) {
  // Suppress noisy but harmless warnings from CJS dependencies like @actions/core
  if (warning.code === 'THIS_IS_UNDEFINED') return
  warn(warning)
}

const config = [
  {
    input: 'src/dereference-json-schema/index.ts',
    output: {
      esModule: true,
      file: 'dist/dereference-json-schema.js',
      format: 'es',
      sourcemap: true
    },
    onwarn,
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
    onwarn,
    plugins: [typescript(), nodeResolve({ preferBuiltins: true }), commonjs()]
  }
]

export default config
