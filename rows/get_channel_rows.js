const asyncMap = require('async/map');
const {flatten} = require('lodash');

const {chainId} = require('./../chains');
const channelFromRow = require('./channel_from_row');
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {nodeNumbers} = require('./constants');
const {queryDdb} = require('./../dynamodb');

/** Get channel rows for a node

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    [limit]: <Channel Rows Limit Number>
    network: <Network Name String>
    public_key: <Public Key Hex String>
  }

  @returns via cbk
  {
    channels: [{
      capacity: <Capacity Tokens Number>
      [close_height]: <Close Height Number>
      id: <Standard Format Channel Id String>
      policies: [{
        alias: <Cached Alias String>
        [attempted]: <Attempt Result String>
        [attempted_at]: <Attempt ISO 8601 Date String>
        [attempted_tokens]: <Attempted Sending With Tokens Number>
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <CLTV Delta Number>
        color: <Cached Color String>
        fee_rate: <Fee Rate Number>
        is_disabled: <Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      updated_at: <Channel Update at ISO 8601 Date String>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyToGetChannelRows']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixToGetChannelRows']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyToGetChannelRows']);
  }

  if (!args.network) {
    return cbk([400, 'ExpectedNetworkToGetChannelsForNode']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedPublicKeyToGetChannelRows']);
  }

  let chain;
  let db;
  const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    return cbk([400, 'ExpectedValidNetworkForChannelRowsFetch', err]);
  }

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedToGetDdbConnectionForChannelRowsFetch', err]);
  }

  return asyncMap(nodeNumbers, (n, cbk) => {
    const where = {};

    where.key = {starts_with: chain};
    where[`node${n}_public_key`] = {eq: args.public_key};

    return queryDdb({
      db,
      where,
      is_descending: true,
      index: `node${n}_public_key-key-index`,
      limit: args.limit,
      table: `${args.aws_dynamodb_table_prefix}-${chansDb}`,
    },
    (err, res) => {
      if (!!err) {
        return cbk(err);
      }

      return cbk(null, res.items);
    });
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const rows = flatten(res).sort((a, b) => a.key < b.key ? -1 : 1);

    return cbk(null, {channels: rows.map(n => channelFromRow(n).channel)});
  });
};

