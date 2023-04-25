/* eslint-disable import/no-extraneous-dependencies */
const { src, dest } = require('gulp');
const transform = require('gulp-transform');
const rename = require('gulp-rename');

const { argv } = require('yargs')
  .option('metadata', {
    describe: 'Input file that describes build metadata',
    default: 'gulpfile.js/metadata.json',
  });

const { readSourceData, validateMetadata } = require('./lib/transform');

const build = () => src(argv.metadata)
  .pipe(transform('utf8', validateMetadata))
  .pipe(transform('utf8', readSourceData))
  .pipe(rename('manifest.yaml'))
  .pipe(dest('.'));

exports.build = build;
