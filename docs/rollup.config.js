import replace from 'rollup-plugin-replace';
import svelte from 'rollup-plugin-svelte';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import filesize from 'rollup-plugin-filesize';

const production = false;

export default {
  name: 'app',
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    file: 'public/bundle.js',
    globals: {}
  },
  external: [],

  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        production ? 'production' : 'development'
      ),
      'process.env.API_KEY': JSON.stringify(
        production ? 'AIzaSyAiBthVwmMBNM5PwhmzUOveXPMGD6nCymo' : 'AIzaSyD7oUvzDD-eXoWc91eECCa0eMHmHVZb1Cg'
      )
    }),

    svelte({
      dev: !production,
      css: css => {
        css.write('public/bundle.css');
      },
      cascade: false,
      hydratable: true,
      store: true
    }),

    resolve(),
    commonjs(),

    filesize()
  ],

  watch: {
    chokidar: true
  }
};
