const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');
const { parse } = require('csv-parse/sync');
const jsonpath = require('jsonpath');
const { execSync } = require('child_process');
const fs = require('fs');

const { logger } = require('../util');

/**
 * Get the src attribute from the iframe containing the Berlin Group file list
 *
 * @param {string} url The Berlin Group downloads page URL
 * @returns {string} The URL of the iframe
 */
const scrapeIframeUrl = async (url) => {
  const browser = await puppeteer
    .launch({ headless: 'new', args: ['--disable-dev-shm-usage'] });
  const page = await browser.newPage();

  // Load the page, waiting for network activty to complete
  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 30000,
  });

  const elementHandle = await page.$('iframe');
  const frame = await elementHandle.contentFrame();

  // Wait for the main table in the iframe to load
  await frame.waitForSelector('#theTable');

  const src = await page.evaluate('document.querySelector("iframe").getAttribute("src")');

  browser.close();

  return src;
};

const getApiSpecificationFileList = async (url) => {
  let $;
  let configurationData;

  try {
    const response = await axios.get(url);
    $ = cheerio.load(response.data);
  } catch (err) {
    throw new Error(`Page download failed with error: ${err.message}`);
  }

  try {
    const inlineJavaScript = $('script[type="text/javascript"]').text();
    const inlineParameters = (inlineJavaScript.match(/initialState.+/)[0] || '{}')
      .replace(/(initialState += +|;$)/g, '');
    configurationData = JSON.parse(inlineParameters);
  } catch (err) {
    throw new Error(`Inline JavaScript not found in source page or could not be parsed: ${err.message}`);
  }

  const csvString = jsonpath.query(configurationData, '$..csvString')[0];

  if (!csvString) {
    throw new Error('Configuration data not found in source page');
  }

  const csvData = parse(csvString);

  return csvData
    .filter((row) => /\.y(a|)ml/.test(row[4]))
    .map((row) => {
      // eslint-disable-next-line no-unused-vars
      const [date, group, fileType, filename, rawMetadata] = row;
      const metadata = JSON.parse(rawMetadata);

      return {
        fileName: `${filename}.yaml`,
        archiveFileName: metadata.docId,
      };
    });
};

const build = async () => {
  const targetDirectory = 'payment-services-directive/openapi/berlin-group';
  const downloadRootUrl = 'https://www.berlin-group.org/_files';

  logger('Getting file list URL from Berlin Group downloads page');

  const fileListUrl = await scrapeIframeUrl('https://www.berlin-group.org/nextgenpsd2-downloads');
  const fileList = await getApiSpecificationFileList(fileListUrl);

  logger('Downloading list of available files from source iframe site');

  const berlinGroupFiles = await Promise.all(fileList
    .map(async (metadata) => {
      const { fileName, archiveFileName } = metadata;

      return {
        fileName,
        archiveUrl: `${downloadRootUrl}/${archiveFileName}`,
      };
    }));

  const processedFiles = await Promise.all(berlinGroupFiles
    .map(async (file) => {
      const outputFileName = `${targetDirectory}/${file.fileName}.zip`;

      logger(`Downloading file as zip file: ${file.fileName}`);
      const response = await axios.get(file.archiveUrl, { responseType: 'arraybuffer' });

      fs.writeFileSync(`${outputFileName}`, response.data);

      logger(`Expanding zip file: ${outputFileName}`);
      execSync(`unzip -d ${targetDirectory} -o "${outputFileName}"`);

      return file.fileName;
    }));

  return {
    standardsBody: 'Berlin Group',
    files: processedFiles,
  };
};

module.exports = build;
