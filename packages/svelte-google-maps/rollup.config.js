import replace from 'rollup-plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import filesize from 'rollup-plugin-filesize';

const production = false;

export default {
  input: 'src/index.js',
  output: {
    sourcemap: true,
    format: 'es',
    file: 'es/svelte-google-maps.js'
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        production ? 'production' : 'development'
      )
    }),

    resolve(),
    commonjs(),
    filesize()
  ],

  watch: {
    chokidar: true
  }
};
