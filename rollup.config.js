const uglify = require('rollup-plugin-terser').terser;
const pkg = require('ramda/package.json');

const banner = '//  Ramda v' + pkg.version + '\n'
  + '//  https://github.com/ramda/ramda\n'
  + '//  (c) 2013-' + new Date().getFullYear() + ' Scott Sauyet, Michael Hurley, and David Chambers\n'
  + '//  Ramda may be freely distributed under the MIT license.\n';

const input = './node_modules/ramda/es/index.js';

const config = {
  input: input,
  output: {
    format: 'umd',
    name: 'R',
    exports: 'named',
    banner: banner
  },
  plugins: []
};

if (process.env.NODE_ENV === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false
      }
    })
  );
}

module.exports = config;
