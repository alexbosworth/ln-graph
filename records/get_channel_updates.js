const {chanIdHexLen} = require('./constants');
const {decrementingNumberForDate} = require('./../dates');
const {lmdb} = require('./../lmdb');
const networks = require('./conf/networks');
const {queryLmdb} = require('./../lmdb');
const {updatesDb} = require('./constants');

/** Get channel updates

  {
    [after]: <After ISO 8601 Date String>
    id: <Channel Id Hex String>
    [limit]: <Limit of Historical Entries Number>
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
  }

  @throws
  <Error>

  @returns
  {
    updates: [{
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_fee_rate]: <Fee Rate in Millitokens Per Million Number>
      [node1_is_disabled]: <Edge is Disabled Bool>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_fee_rate]: <Fee Rate in Millitokens Per Million Number>
      [node2_is_disabled]: <Edge is Disabled Bool>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }]
  }
*/
module.exports = args => {
  if (!args.id || args.id.length !== chanIdHexLen) {
    throw new Error('ExpectedChannelIdToGetChannelUpdatesFor');
  }

  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetChannelUpdates');
  }

  if (!args.network || !networks.chain_ids[args.network]) {
    throw new Error('ExpectedNetworkToGetChannelUpdates');
  }

  const chainId = networks.chain_ids[args.network];
  const db = updatesDb;
  let start = null;

  try {
    start = !args.after ? '' : decrementingNumberForDate({date: args.after});
  } catch (err) {
    throw new Error('FailedToDeriveStartDateForChannelUpdatesQuery');
  }

  const where = {
    before: !start ? undefined : start.number,
    starts_with: `${chainId}${args.id}`,
  };

  try {
    const {items} = queryLmdb({
      db,
      where,
      limit: args.limit,
      lmdb: lmdb({path: args.lmdb_path}),
    });

    const updates = items.map(({key, data}) => {
      return {
        node1_base_fee_mtokens: data.node1_base_fee_mtokens,
        node1_cltv_delta: data.node1_cltv_delta,
        node1_min_htlc_mtokens: data.node1_min_htlc_mtokens,
        node1_fee_rate: data.node1_fee_rate,
        node1_is_disabled: data.node1_is_disabled,
        node1_updated_at: data.node1_updated_at,
        node2_base_fee_mtokens: data.node2_base_fee_mtokens,
        node2_cltv_delta: data.node2_cltv_delta,
        node2_fee_rate: data.node2_fee_rate,
        node2_is_disabled: data.node2_is_disabled,
        node2_min_htlc_mtokens: data.node2_min_htlc_mtokens,
        node2_updated_at: data.node2_updated_at,
      };
    });

    return {updates};
  } catch (err) {
    throw new Error('FailedToQueryChannelUpdates');
  }
};

