const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {getEdgeRecords} = require('./../records');
const {getEdgeRows} = require('./../rows');

/** Get edge history

  {
    [after]: <After ISO 8601 Date String>
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    channel: <Standard Format Channel Id String>
    [limit]: <Limit Number>
    [lmdb_path]: <LMDB Path String>
    network: <Network Name String>
    to_public_key: <To Public Key Hex String>
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
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id && !args.lmdb_path) {
        return cbk([400, 'ExpectedAwsOrLmdbToGetEdgeHistory']);
      }

      if (!args.channel) {
        return cbk([400, 'ExpectedChannelIdToGetEdgeHistory']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkToGetEdgeHistory']);
      }

      if (!args.to_public_key) {
        return cbk([400, 'ExpectedPublicKeyToGetEdgeHistory']);
      }

      return cbk();
    },

    // Get rows from dynamodb
    fromDdb: ['validate', ({}, cbk) => {
      if (!args.aws_access_key_id) {
        return cbk();
      }

      return getEdgeRows({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        channel: args.channel,
        limit: args.limit,
        network: args.network,
        to_public_key: args.to_public_key,
      },
      cbk);
    }],

    // Get records from lmdb
    fromLmdb: ['validate', ({}, cbk) => {
      if (!args.lmdb_path) {
        return cbk();
      }

      return cbk(null, getEdgeRecords({
        after: args.after,
        channel: args.channel,
        limit: args.limit,
        lmdb_path: args.lmdb_path,
        network: args.network,
        to_public_key: args.to_public_key,
      }));
    }],

    // All attempts
    attempts: ['fromDdb', 'fromLmdb', ({fromDdb, fromLmdb}, cbk) => {
      const ddbAttempts = !!fromDdb ? fromDdb.attempts : [];
      const lmdbAttempts = !!fromLmdb ? fromLmdb.attempts : [];

      const attempts = [].concat(ddbAttempts).concat(lmdbAttempts);

      attempts.sort((a, b) => a.attempted_at > b.attempted_at ? -1 : 1);

      return cbk(null, {attempts});
    }],
  },
  returnResult({of: 'attempts'}, cbk));
};

