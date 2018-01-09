import svelte from 'rollup-plugin-svelte';
import replace from 'rollup-plugin-replace';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import uglify from 'rollup-plugin-uglify-es';

const production = false;

export default {
  input: 'src/index.umd.js',
  output: {
    sourcemap: true,
    format: 'umd',
    file: 'umd/svelte-google-maps.js'
  },
  name: 'SvelteGoogleMaps',
  plugins: [
    svelte({
      dev: !production,
      cascade: false,
      hydratable: true,
      store: true
    }),

    replace({
      'process.env.NODE_ENV': JSON.stringify(
        production ? 'production' : 'development'
      )
    }),

    resolve(),
    commonjs(),
    filesize(),

    production && uglify()
  ],

  watch: {
    chokidar: true
  }
};
