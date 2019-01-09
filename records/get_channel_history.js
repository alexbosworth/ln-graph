const {rawChanId} = require('bolt07');

const {chanIdHexLen} = require('./constants');
const {ddb} = require('./../dynamodb');
const {defaultHistoryLimit} = require('./constants');
const networks = require('./conf/networks');
const {queryDdb} = require('./../dynamodb');
const {updatesDb} = require('./constants');

/** Get the history of a channel

  {
    [after]: <After ISO 8601 Date String>
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    id: <Standard Format Channel Id String>
    [limit]: <Limit of Historical Entries Number>
    network: <Network Name String>
  }

  @returns via cbk
  {
    updates: [{
      channel: <Standard Format Channel Id String>
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node1_is_disabled]: <Edge is Disabled Bool>
      [node1_fee_rate]: <Fee Rate in Millitokens Per Million Number>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_is_disabled]: <Edge is Disabled Bool>
      [node2_fee_rate]: <Fee Rate in Millitokens Per Million Number>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyIdForChannelHistoryLookup']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixForChannelHistoryLookup']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyForChannelHistoryLookup']);
  }

  if (!args.id) {
    return cbk([400, 'ExpectedChannelIdForChannelHistoryLookup']);
  }

  if (!args.network) {
    return cbk([400, 'ExpectedNetworkForChannelHistoryLookup']);
  }

  let id;

  try {
    id = rawChanId({channel: args.id}).id;
  } catch (err) {
    return cbk([400, 'ExpectedStandardFormatChannelIdString', err]);
  }

  let chain;

  switch (args.network) {
  case (networks.codes.bitcoin):
    chain = networks.chain_ids[networks.codes.bitcoin];
    break;

  case (networks.codes.testnet):
    chain = networks.chain_ids[networks.codes.testnet];
    break;

  default:
    return cbk([400, 'ExpectedKnownNetworkForChannelHistoryLookup']);
  }

  let db;
  const where = {key: {eq: `${chain}${id}`}};

  if (!!args.after) {
    where.updated_at = {gt: args.after};
  }

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedCreatingDynamoDbForHistoryLookup', err]);
  }

  return queryDdb({
    db,
    where,
    is_descending: true,
    limit: args.limit || defaultHistoryLimit,
    table: `${args.aws_dynamodb_table_prefix}-${updatesDb}`,
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingChannelHistory', err]);
    }

    const updates = res.items.map(n => ({
      channel: args.id,
      close_height: n.close_height,
      node1_base_fee_mtokens: n.node1_base_fee_mtokens,
      node1_cltv_delta: n.node1_cltv_delta,
      node1_fee_rate: n.node1_fee_rate,
      node1_is_disabled: n.node1_is_disabled,
      node1_min_htlc_mtokens: n.node1_min_htlc_mtokens,
      node1_public_key: n.node1_public_key,
      node1_updated_at: n.node1_updated_at,
      node2_base_fee_mtokens: n.node2_base_fee_mtokens,
      node2_cltv_delta: n.node2_cltv_delta,
      node2_fee_rate: n.node2_fee_rate,
      node2_is_disabled: n.node2_is_disabled,
      node2_min_htlc_mtokens: n.node2_min_htlc_mtokens,
      node2_public_key: n.node2_public_key,
      node2_updated_at: n.node2_updated_at,
    }));

    return cbk(null, {updates});
  });
};

