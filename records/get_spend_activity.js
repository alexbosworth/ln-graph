const {createHash} = require('crypto');

const BN = require('bn.js');

const {channelIdFromBuffer} = require('./../bolt07');
const {ddb} = require('./../dynamodb');
const {query} = require('./../dynamodb');

const decimalBase = 10;
const defaultLimit = 6;

/** Get spend activity between two peers

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    from_public_key: <Public Key Hex String>
    [limit]: <Activity Results Limit Number>
    to_public_key: <Public Key Hex String>
  }

  @returns via cbk  
  {
    spends: [{
      created_at: <Spend Record Created At ISO 8601 Date String>
      hops: [<Channel Id String>]
      tokens: <Tokens Sent Number>
      type: <Result Type>
    }]
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyIdForSpendingActivityHistory']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixForSpendingActivityHistory']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyForSpendingActivityHistory']);
  }

  if (!args.from_public_key) {
    return cbk([400, 'ExpectedFromPublicKeyForSpendingActivityHistory']);
  }

  if (!args.to_public_key) {
    return cbk([400, 'ExpectedToPublicKeyForSpendingActivityHistory']);
  }

  let db;
  const pair = `${args.from_public_key}${args.to_public_key}`;

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedDbInitForSpendActivityQuery', err]);
  }

  const pairHash = createHash('sha256').update(Buffer.from(pair, 'hex'));

  return query({
    db,
    is_descending: true,
    limit: args.limit || defaultLimit,
    table: `${args.aws_dynamodb_table_prefix}-spend-activity`,
    where: {pair: {eq: pairHash.digest()}},
  },
  (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorGettingSpendActivity', err]);
    }

    try {
      const spends = res.items.map(item => ({
        created_at: item.created_at,
        from_public_key: item.from_public_key,
        hops: item.hops.split(':').map(id => {
          return channelIdFromBuffer({id: Buffer.from(id, 'hex')});
        }),
        tokens: item.tokens,
        to_public_key: item.to_public_key,
        type: item.type,
      }));

      return cbk(null, {spends});
    } catch (err) {
      return cbk([503, 'FailedToParseSpendActivityItems', err]);
    }
  });
};

