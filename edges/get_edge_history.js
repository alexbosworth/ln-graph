const asyncAuto = require('async/auto');
const {rawChanId} = require('bolt07');

const {getEdgeRecords} = require('./../records');
const {getEdgeRows} = require('./../rows');
const {returnResult} = require('./../async');

/** Get edge history

  {
    [after]: <After ISO 8601 Date String>
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    channel: <Channel Id String>
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

    // Raw channel id
    channelId: ['validate', ({}, cbk) => {
      try {
        return cbk(null, rawChanId({channel: args.channel}).id);
      } catch (err) {
        return cbk([400, 'ExpectedValidChannelIdForEdgeHistoryLookup']);
      }
    }],

    // Get rows from dynamodb
    fromDdb: ['channelId', ({channelId}, cbk) => {
      if (!args.aws_access_key_id) {
        return cbk();
      }

      return getEdgeRows({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        channel_id: channelId,
        limit: args.limit,
        network: args.network,
        to_public_key: args.to_public_key,
      },
      cbk);
    }],

    // Get records from lmdb
    fromLmdb: ['channelId', ({channelId}, cbk) => {
      if (!args.lmdb_path) {
        return cbk();
      }

      return cbk(null, getEdgeRecords({
        after: args.after,
        channel_id: channelId,
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

      return cbk(null, {attempts});
    }]
  },
  returnResult({of: 'attempts'}, cbk));
};

