const axios = require('axios');
const AdmZip = require('adm-zip');

const { logger } = require('../util');

const getUkOpenBankingReleases = async (
  repoOwner,
  repoName,
) => (await axios.get(`https://api.github.com/repos/${repoOwner}/${repoName}/releases`)).data;

module.exports = async (args) => {
  const { title, parentOutputDir } = args || {};

  if (!title || !parentOutputDir) {
    throw new Error(`Mandatory parameters missing when executing ${__filename.split('/').pop()}: [title] [parentOutputDir]`);
  }

  if (!process.env.UK_OPEN_BANKING_REPOSITORY_OWNER
    || !process.env.UK_OPEN_BANKING_REPOSITORY_NAME) {
    throw new Error(`UK_OPEN_BANKING_REPOSITORY_OWNER or UK_OPEN_BANKING_REPOSITORY_NAME not set in environment when executing ${__filename.split('/').pop()}`);
  }

  const releases = ((await getUkOpenBankingReleases(
    process.env.UK_OPEN_BANKING_REPOSITORY_OWNER,
    process.env.UK_OPEN_BANKING_REPOSITORY_NAME,
  )) || [])
    .filter((release) => !release.prerelease && /[0-9]+\.[0-9]+\.[0-9]+$/.test(release.tag_name))
    .map((release) => {
      const { tag_name: tagName, zipball_url: zipballUrl } = release;

      return {
        tagName,
        zipballUrl,
        downloadUrl: zipballUrl
          .replace('api.', '')
          .replace('/repos', '')
          .replace('zipball', 'zipball/refs/tags'),
      };
    });

  const openApiFiles = await releases
    .reduce(async (output, release) => {
      await output;

      const { tagName, downloadUrl } = release;
      const archiveFileName = `${parentOutputDir}/${tagName}.zip`;

      logger(`Downloading ${downloadUrl} to ${archiveFileName}`);
      const { data } = await axios.get(
        downloadUrl,
        { responseType: 'arraybuffer' },
      );

      const zipData = new AdmZip(data);
      const extractedFiles = zipData.getEntries()
        .filter((entry) => entry.entryName.match(/openapi\.(y(a|)ml|json)/))
        .map((entry) => {
          zipData.extractEntryTo(entry.entryName, `${parentOutputDir}/${tagName}`, false, true);

          return `${tagName}/${entry.entryName.split('/').pop()}`;
        });

      return (await output)
        .concat(extractedFiles);
    }, []);

  return {
    standardsBody: title,
    openApi: {
      directory: parentOutputDir,
      files: openApiFiles,
    },
  };
};
