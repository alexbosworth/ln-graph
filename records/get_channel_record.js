const {chanIdHexLen} = require('./constants');
const {chansDb} = require('./constants');
const {getLmdbItem} = require('./../lmdb');
const {lmdb} = require('./../lmdb');
const networks = require('./conf/networks');

/** Get channel

  {
    id: <Channel Id Hex String>
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
  }

  @throws
  <Error>

  @returns
  {
    [channel] {
      capacity: <Maximum Tokens Number>
      [close_height]: <Close Height Number>
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
      type: <Row Type String>
      [updated_at]: <Channel Last Updated At ISO 8601 Date String>
    }
  }
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetChannelRecord');
  }

  if (!args.id) {
    throw new Error('ExpectedChannelIdToGetChannelRecord');
  }

  if (!args.network) {
    throw new Error('ExpectedNetworkToGetChannel');
  }

  const chain = networks.chain_ids[args.network];
  const db = chansDb;

  const key = `${chain}${args.id}`;

  try {
    const {item} = getLmdbItem({db, key, lmdb: lmdb({path: args.lmdb_path})});

    if (!item) {
      return {};
    }

    const policy1 = {};
    const policy2 = {};

    policy1.base_fee_mtokens = item.node1_base_fee_mtokens;
    policy1.cltv_delta = item.node1_cltv_delta;
    policy1.fee_rate = item.node1_fee_rate;
    policy1.is_disabled = item.node1_is_disabled;
    policy1.min_htlc_mtokens = item.node1_min_htlc_tokens;
    policy1.public_key = item.node1_public_key;
    policy1.updated_at = item.node1_updated_at;

    policy2.base_fee_mtokens = item.node2_base_fee_mtokens;
    policy2.cltv_delta = item.node2_cltv_delta;
    policy2.fee_rate = item.node2_fee_rate;
    policy2.is_disabled = item.node2_is_disabled;
    policy2.min_htlc_mtokens = item.node2_min_htlc_tokens;
    policy2.public_key = item.node2_public_key;
    policy2.updated_at = item.node2_updated_at;

    const updates = [policy1.updated_at, policy2.updated_at].filter(n => !!n);

    const [update] = updates.sort().reverse();

    return {
      channel: {
        capacity: item.capacity,
        close_height: item.close_height,
        policies: [policy1, policy2],
        transaction_id: item.transaction_id,
        transaction_vout: item.transaction_vout,
        updated_at: update,
      },
    };
  } catch (err) {
    throw new Error('FailedToGetChannelRecordDetails');
  }
};

