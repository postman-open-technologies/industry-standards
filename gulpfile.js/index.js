const { src, dest } = require('gulp');
const transform = require('gulp-transform');
const rename = require('gulp-rename');
const dotenv = require('dotenv');

const { argv } = require('yargs')
  .option('metadata', {
    describe: 'Input file that describes build metadata',
    default: 'gulpfile.js/metadata.json',
  })
  .option('env-file', {
    describe: 'Non-sensitive environment variables',
    default: 'gulpfile.js/.env',
  });

dotenv.config({ path: argv.envFile });

const { readSourceData, validateMetadata } = require('./lib/transform');

const build = () => src(argv.metadata)
  .pipe(transform('utf8', validateMetadata))
  .pipe(transform('utf8', readSourceData))
  .pipe(rename('manifest.yaml'))
  .pipe(dest('.'));

exports.build = build;
