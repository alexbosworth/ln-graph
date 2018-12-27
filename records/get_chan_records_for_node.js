const {chansDb} = require('./constants');
const {chainId} = require('./../chains');
const {chainIdHexLen} = require('./constants');
const {getLmdbItem} = require('./../lmdb');
const {lmdb} = require('./../lmdb');
const {nodeChannelsDb} = require('./constants');
const {pkHexLen} = require('./constants');
const {queryLmdb} = require('./../lmdb');

/** Get channels for a node

  {
    lmdb_path: <LMDB Path>
    network: <Network Name String>
    public_key: <Public Key Hex String>
  }

  @throws
  <Error>

  @returns
  {
    channels: [{
      capacity: <Capacity Tokens Number>
      id: <Channel Id Hex String>
      policies: [{
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <CLTV Delta Number>
        fee_rate: <Fee Rate In Millitokens Per Million Number>
        is_disabled: <Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
    }]
  }
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetChannelsForNode');
  }

  if (!args.network) {
    throw new Error('ExpectedNetworkForNodeChannels');
  }

  if (!args.public_key || args.public_key.length !== pkHexLen) {
    throw new Error('ExpectedPublicKeyToGetChannelsForNode');
  }

  let chain;
  const db = nodeChannelsDb;

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    throw new Error('ExpectedValidNetworkToGetChannelsForNode');
  }

  const where = {starts_with: `${args.public_key}${chain}`};

  try {
    const {items} = queryLmdb({db, where, lmdb: lmdb({path: args.lmdb_path})});

    const chanIds = items.map(({key}) => key.slice(pkHexLen + chainIdHexLen));

    const channels = chanIds
      .map(id => {
        const {item} = getLmdbItem({
          db: chansDb,
          key: `${chain}${id}`,
          lmdb: lmdb({path: args.lmdb_path}),
        });

        if (!item || !!item.close_height) {
          return;
        }

        const policies = [
          {
            base_fee_mtokens: item.node1_base_fee_mtokens,
            cltv_delta: item.node1_cltv_delta,
            fee_rate: item.node1_fee_rate,
            is_disabled: item.node1_is_disabled,
            min_htlc_mtokens: item.node1_min_htlc_tokens,
            public_key: item.node1_public_key || undefined,
          },
          {
            base_fee_mtokens: item.node2_base_fee_mtokens,
            cltv_delta: item.node2_cltv_delta,
            fee_rate: item.node2_fee_rate,
            is_disabled: item.node2_is_disabled,
            min_htlc_mtokens: item.node2_min_htlc_tokens,
            public_key: item.node2_public_key || undefined
          },
        ];

        return {id, policies, capacity: item.capacity};
      })
      .filter(n => !!n);

    return {channels};
  } catch (err) {
    throw new Error('FailedToQueryChannelsForNode');
  }
};

