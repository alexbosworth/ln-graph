const chainIds = require('./conf/networks').chain_ids;
const {nodesDb} = require('./constants');
const {notFound} = require('./constants');
const {lmdb} = require('./../lmdb');
const {queryLmdb} = require('./../lmdb');

/** Get all nodes

  {
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
  }

  @throws
  <Error>

  @returns
  {
    nodes: [{
      alias: <Alias String>
      color: <Color String>
      public_key: <Public Key Hex String>
      [sockets]: [<Socket String>]
      updated_at: <ISO 8601 Date String>
    }]
  }
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetAllNodes');
  }

  if (!args.network || !chainIds[args.network]) {
    throw new Error('ExpectedNetworkWhenGettingAllNodes');
  }

  const chainId = chainIds[args.network];
  const db = nodesDb;

  try {
    const {items} = queryLmdb({db, lmdb: lmdb({path: args.lmdb_path})});

    const nodes = items
      .map(({data, key}) => ({
        alias: data.alias,
        chains: data.chains,
        color: data.color,
        public_key: key,
        sockets: data.sockets,
        updated_at: data.updated_at,
      }))
      .filter(node => node.chains.indexOf(chainId) !== notFound)
      .map(n => ({
        alias: n.alias,
        color: n.color,
        public_key: n.public_key,
        sockets: n.sockets,
        updated_at: n.updated_at,
      }));

    return {nodes};
  } catch (err) {
    throw new Error('FailedToGetNodes');
  }
};
