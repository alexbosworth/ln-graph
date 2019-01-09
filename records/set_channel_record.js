const {rawChanId} = require('bolt07');

const {chanIdHexLen} = require('./constants');
const {chainId} = require('./../chains');
const {chansDb} = require('./constants');
const {lmdb} = require('./../lmdb');
const {nodeChannelsDb} = require('./constants');
const {nodeNumbers} = require('./constants');
const {putLmdbItem} = require('./../lmdb');

/** Directly set a channel record

  {
    capacity: <Maximum Tokens Number>
    [close_height]: <Channel Close Height Number>
    id: <Standard Format Channel Id String>
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
    policies: [{
      [base_fee_mtokens]: <Base Fee Millitokens String>
      [cltv_delta]: <Locktime Delta Number>
      [fee_rate]: <Fees Charged Per Million Tokens Number>
      [is_disabled]: <Channel Is Disabled Bool>
      [min_htlc_mtokens]: <Minimum HTLC Millitokens Value Number>
      [public_key]: <Node Public Key String>
    }]
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
    updated_at: <Channel Last Updated At ISO 8601 Date String>
  }

  @throws <Error>
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToSetChannel');
  }

  if (!args.id) {
    throw new Error('ExpectedChannelIdToSetChannelRecord');
  }

  if (!args.network) {
    throw new Error('ExpectedNetworkToSetChannel');
  }

  let chain;
  let id;

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    throw new Error('ExpectedValidChannelNetwork');
  }

  try {
    id = rawChanId({channel: args.id}).id;
  } catch (err) {
    throw new Error('ExpectedChannelIdToSetChannelRecord');
  }

  const [policy1, policy2] = args.policies;

  const channel = {
    capacity: args.capacity,
    close_height: args.close_height,
    node1_base_fee_mtokens: policy1.base_fee_mtokens,
    node1_cltv_delta: policy1.cltv_delta,
    node1_fee_rate: policy1.fee_rate,
    node1_is_disabled: policy1.is_disabled,
    node1_min_htlc_tokens: policy1.min_htlc_mtokens,
    node1_public_key: policy1.public_key,
    node1_updated_at: args.updated_at,
    node2_base_fee_mtokens: policy2.base_fee_mtokens,
    node2_cltv_delta: policy2.cltv_delta,
    node2_fee_rate: policy2.fee_rate,
    node2_is_disabled: policy2.is_disabled,
    node2_min_htlc_tokens: policy2.min_htlc_mtokens,
    node2_public_key: policy2.public_key,
    node2_updated_at: args.updated_at,
    transaction_id: args.transaction_id,
    transaction_vout: args.transaction_vout,
  };

  try {
    putLmdbItem({
      db: chansDb,
      key: `${chain}${id}`,
      lmdb: lmdb({path: args.lmdb_path}),
      value: channel,
    });

    // Create links from the pubkeys to the channel id
    nodeNumbers
      .map(n => channel[`node${n}_public_key`])
      .filter(n => !!n)
      .map(pubKey => ({
        db: nodeChannelsDb,
        key: `${pubKey}${chain}${id}`,
        lmdb: lmdb({path: args.lmdb_path}),
      }))
      .forEach(({db, key, lmdb}) => putLmdbItem({db, key, lmdb, value: {}}));
  } catch (err) {
    throw new Error('UnexpectedFailureSettingChannelRecord');
  }
};

