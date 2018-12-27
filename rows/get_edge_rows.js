const {chainId} = require('./../chains');
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {edgeActivityDb} = require('./constants');
const {queryDdb} = require('./../dynamodb');

/** Get edge history rows for a node

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    channel_id: <Raw Channel Id Hex String>
    [limit]: <Limit Number>
    network: <Network Name String>
    to_public_key: <Public Key Hex String>
  }

  @returns via cbk
  {
    attempts: [{
      attempted_at: <Attempted At ISO 8601 Date String>
      tokens: <Tokens Number>
      type: <Type String>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyToGetEdgeHistoryRows']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixToGetEdgeRows']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyToGetEdgeRows']);
  }

  if (!args.channel_id) {
    return cbk([400, 'ExpectedChannelIdToGetEdgeRows']);
  }

  if (!args.network) {
    return cbk([400, 'ExpectedChannelNetworkToGetEdgeRows']);
  }

  if (!args.to_public_key) {
    return cbk([400, 'ExpectedPublicKeyToGetEdgeRows']);
  }

  let chain;
  let db;
  const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    return cbk([400, 'ExpectedValidNetworkForEdgeRowsFetch', err]);
  }

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedToGetDdbConnectionForEdgeRowsFetch', err]);
  }

  return queryDdb({
    db,
    is_descending: true,
    limit: args.limit || undefined,
    table: `${args.aws_dynamodb_table_prefix}-${edgeActivityDb}`,
    where: {edge: {eq: `${args.to_public_key}${chain}${args.channel_id}`}},
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const attempts = res.items.map(n => ({
      attempted_at: n.attempted_at,
      tokens: n.tokens,
      type: n.type
    }));

    return cbk(null, {attempts});
  });
};

