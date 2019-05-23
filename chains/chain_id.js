const {chainIds} = require('./constants');

/** Chain id for network

  {
    [network]: <Network Name String>
  }

  @throws
  <Error>

  @returns
  {
    chain_id: <Chain Id Hex String>
  }
*/
module.exports = ({network}) => {
  if (!network || !chainIds[network]) {
    throw new Error('ExpectedNetworkForChainId');
  }

  return {chain_id: chainIds[network]};
};
