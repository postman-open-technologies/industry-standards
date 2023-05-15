const dotenv = require('dotenv');

const chai = require('chai');
const chap = require('chai-as-promised');
const sinon = require('sinon');

const axios = require('axios');
const AdmZip = require('adm-zip');

chai.use(chap);

const { expect } = chai;

const getUkOpenBankingStandards = require('../../../lib/processors/uk-open-banking');

describe(__filename, () => {
  describe('getUkOpenBankingStandards function', () => {
    dotenv.config({ path: `${__dirname}/../../data/.env` });
    const title = 'UK Open Banking';
    const parentOutputDir = 'uk-open-banking/openapi';
    const args = { title, parentOutputDir };

    const sandbox = sinon.createSandbox();
    let axiosStub = null;

    beforeEach(() => {
      axiosStub = sandbox.stub(axios, 'get');
    }); // eslint-disable-line no-return-assign
    afterEach(() => { sandbox.restore(); });

    it('Throw an error is parameters are missing', async () => {
      await expect(getUkOpenBankingStandards())
        .to.be.rejectedWith('Mandatory parameters missing when executing uk-open-banking.js: [title] [parentOutputDir');
    });
    it('Throw an error when mandatory environment variable is not set', async () => {
      delete process.env.UK_OPEN_BANKING_REPOSITORY_OWNER;

      await expect(getUkOpenBankingStandards(args))
        .to.be.rejectedWith('UK_OPEN_BANKING_REPOSITORY_OWNER or UK_OPEN_BANKING_REPOSITORY_NAME not set in environment when executing uk-open-banking.js');
    });
    it('Return expected number of releases as manifest', async () => {
      process.env.UK_OPEN_BANKING_REPOSITORY_OWNER = 'OpenBankingUK';

      axiosStub.onCall(0)
        .returns(Promise.resolve({
          data: [
            {
              tag_name: 'v3.10.1',
              zipball_url: 'zipball',
            },
          ],
        }));
      axiosStub.onCall(1).returns(Promise.resolve({
        data: '',
      }));
      const admZipStub = sandbox.stub(AdmZip);

      admZipStub.prototype.getEntries = sandbox.stub();

      await expect(getUkOpenBankingStandards(args)).to.eventually.deep.equal({
        standardsBody: title,
        openApi: {
          directory: parentOutputDir,
          files: [],
        },
      });
    });
  });
});
