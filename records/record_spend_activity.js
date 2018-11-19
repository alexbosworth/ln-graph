const {createHash} = require('crypto');

const BN = require('bn.js');

const {ddb} = require('./../dynamodb');
const {putItem} = require('./../dynamodb');

const decBase = 10;
const notFound = -1;
const types = ['probe_success', 'stuck_htlc'];

/** Record spend activity between a directed pair of nodes

  This data is intended so that when attempting a payment, a lookup can be done
  to judge potential routes based on the success or failure of past attempts.

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    created_at: <Created At ISO 8601 Date String>
    from_public_key: <From Node Public Key String>
    hops: [<Route Hop Channel Id Number String>]
    to_public_key: <To Node Public Key String>
    tokens: <Tokens Sent Number>
    type: <Result Type>
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAccessKeyForSpendActivityRecord']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedTablePrefixForSpendActivityRecord']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedSecretKeyForSpendActivityRecord']);
  }

  if (!args.created_at) {
    return cbk([400, 'ExpectedCreatedDateForSpendActivityRecord']);
  }

  if (!args.from_public_key) {
    return cbk([400, 'ExpectedSourcePublicKeyForSpendActivityRecord']);
  }

  if (!Array.isArray(args.hops) || !args.hops.length) {
    return cbk([400, 'ExpectedRouteHopsForSpendActivityRecord']);
  }

  if (!args.to_public_key) {
    return cbk([400, 'ExpectedDestinationPublicKeyForSpendActivityRecord']);
  }

  if (args.tokens === undefined) {
    return cbk([400, 'ExpectedSpendTokensCountForSpendActivityRecord']);
  }

  if (types.indexOf(args.type) === notFound) {
    return cbk([400, 'ExpectedKnownSpendTypeForSpendActivity']);
  }

  let db;

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedDatabaseInitForSpendRecord']);
  }

  const fresh = ['created_at'];
  const pair = `${args.from_public_key}${args.to_public_key}`;
  const table = `${args.aws_dynamodb_table_prefix}-spend-activity`;

  // Create the row
  const item = {
    created_at: args.created_at,
    from_public_key: args.from_public_key,
    hops: args.hops.map(n => new BN(n, decBase).toBuffer().toString('hex')),
    pair: createHash('sha256').update(Buffer.from(pair, 'hex')).digest(),
    to_public_key: args.to_public_key,
    tokens: args.tokens,
    type: args.type,
  };

  return putItem({db, fresh, item, table}, err => {
    if (!!err) {
      return cbk(err);
    }

    return cbk();
  });
};

