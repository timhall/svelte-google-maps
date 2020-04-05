import commonjs from 'rollup-plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import svelte from 'rollup-plugin-svelte';

require('dotenv').config({ path: '../.env' });

const production = process.env.NODE_ENV === 'production';

export default {
  name: 'app',
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    file: 'public/bundle.js',
    globals: {},
  },
  external: [],

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development'),
      'process.env.API_KEY': JSON.stringify(
        production ? process.env.GOOGLE_MAPS_PROD_KEY : process.env.GOOGLE_MAPS_DEV_KEY
      ),
    }),

    svelte({
      dev: !production,
      css: (css) => {
        css.write('public/bundle.css');
      },
      cascade: false,
      hydratable: true,
      store: true,
    }),

    resolve(),
    commonjs(),

    filesize(),
  ],

  watch: {
    chokidar: true,
  },
};
