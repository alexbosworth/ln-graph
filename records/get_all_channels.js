const {chainIdHexLen} = require('./constants');
const chainIds = require('./conf/networks').chain_ids;
const {chansDb} = require('./constants');
const {chanFormat} = require('bolt07');
const {notFound} = require('./constants');
const {lmdb} = require('./../lmdb');
const {queryLmdb} = require('./../lmdb');

/** Get all channels

  {
    [is_active]: <Is Active Bool>>
    lmdb_path: <LMDB Path String>
    [min_capacity]: <Minimum Capacity Tokens Number>
    network: <Network Name String>
  }

  @throws
  <Error>

  @returns
  {
    channels: [{
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
    }]
  }
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetAllChannels');
  }

  if (!args.network || !chainIds[args.network]) {
    throw new Error('ExpectedNetworkWhenGettingAllChannels');
  }

  const chainId = chainIds[args.network];
  const db = chansDb;
  const minCapacity = args.min_capacity;

  const where = {};

  // Require that the channel is active on both sides
  if (!!args.is_active) {
    where.node1_is_disabled = {eq: false};
    where.node2_is_disabled = {eq: false};
  }

  try {
    const {items} = queryLmdb({
      db,
      keys: {starts_with: chainId},
      lmdb: lmdb({path: args.lmdb_path}),
      where: !minCapacity ? undefined : {capacity: {gt: minCapacity - 1}},
    });

    const channels = items.map(({data, key}) => {
      const policy1 = {};
      const policy2 = {};

      policy1.base_fee_mtokens = data.node1_base_fee_mtokens;
      policy1.cltv_delta = data.node1_cltv_delta;
      policy1.fee_rate = data.node1_fee_rate;
      policy1.is_disabled = data.node1_is_disabled;
      policy1.min_htlc_mtokens = data.node1_min_htlc_tokens;
      policy1.public_key = data.node1_public_key;
      policy1.updated_at = data.node1_updated_at;

      policy2.base_fee_mtokens = data.node2_base_fee_mtokens;
      policy2.cltv_delta = data.node2_cltv_delta;
      policy2.fee_rate = data.node2_fee_rate;
      policy2.is_disabled = data.node2_is_disabled;
      policy2.min_htlc_mtokens = data.node2_min_htlc_tokens;
      policy2.public_key = data.node2_public_key;
      policy2.updated_at = data.node2_updated_at;

      const updates = [policy1.updated_at, policy2.updated_at]
        .filter(n => !!n);

      const [update] = updates.sort().reverse();

      return {
        capacity: data.capacity,
        close_height: data.close_height,
        id: chanFormat({id: key.slice(chainIdHexLen)}).channel,
        policies: [policy1, policy2],
        transaction_id: data.transaction_id,
        transaction_vout: data.transaction_vout,
        updated_at: update,
      };
    });

    return {channels};
  } catch (err) {
    throw new Error('FailedToGetAllChannelRecords');
  }
};
