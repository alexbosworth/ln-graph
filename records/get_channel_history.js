const BN = require('bn.js');

const {ddb} = require('./../dynamodb');
const {query} = require('./../dynamodb');

const decimalBase = 10;
const defaultHistoryLimit = 6;

/** Get the history of a channel

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    id: <Channel Id String>
    [limit]: <Limit of Historical Entries Number>
  }

  @returns via cbk
  {
    updates: [{
      channel_id: <Channel Id Buffer Object>
      node1_cltv_delta: <CLTV Delta Number>
      node1_min_htlc_mtokens: <Minimum HTLC Millitokens String>
      node1_base_fee_mtokens: <Base Fee Millitokens String>
      node1_updated_at: <Policy Updated At ISO 8601 Date String>
      node1_is_disabled: <Edge is Disabled Bool>
      node1_fee_rate: <Fee Rate in Millitokens Per Million Number>
      node2_cltv_delta: <CLTV Delta Number>
      node2_min_htlc_mtokens: <Minimum HTLC Millitokens String>
      node2_base_fee_mtokens: <Base Fee Millitokens String>
      node2_updated_at: <Policy Updated At ISO 8601 Date String>
      node2_is_disabled: <Edge is Disabled Bool>
      node2_fee_rate: <Fee Rate in Millitokens Per Million Number>
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

  const channelId = new BN(args.id, decimalBase).toBuffer();
  let db;

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedCreatingDynamoDbForHistoryLookup', err]);
  }

  return query({
    db,
    is_descending: true,
    limit: args.limit || defaultHistoryLimit,
    table: `${args.aws_dynamodb_table_prefix}-channels-history`,
    where: {channel_id: {eq: channelId}},
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingChannelHistory', err]);
    }

    return cbk(null, {updates: res.items});
  });
};

