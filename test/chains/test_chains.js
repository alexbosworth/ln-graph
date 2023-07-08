const {equal} = require('node:assert').strict;
const test = require('node:test');
const {throws} = require('node:assert').strict;

const {chainId} = require('./../../chains');

const tests = [
  {
    args: {network: 'btc'},
    description: 'Get a chain id',
    expected: '00',
  },
  {
    args: {network: 'invalid_network'},
    description: 'Get an error for an invalid network',
    error: 'ExpectedNetworkForChainId',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, (t, end) => {
    if (!error) {
      const networkDetails = chainId(args);

      equal(networkDetails.chain_id, expected, 'Got chain id');
    } else {
      throws(() => chainId(args), new Error(error));
    }

    return end();
  });
});
