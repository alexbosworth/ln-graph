const asyncAuto = require('async/auto');

const {activityDb} = require('./constants');
const {activityTypes} = require('./constants');
const chainIds = require('./conf/networks').chain_ids;
const {ddb} = require('./../dynamodb');
const {decrementingNumberForDate} = require('./../dates');
const {lmdb} = require('./../lmdb');
const {notFound} = require('./constants');
const {putDdbItem} = require('./../dynamodb');
const {putLmdbItem} = require('./../lmdb');
const {returnResult} = require('./../async');

/** Record edge activity

  {
    attempted_at: <Activity Attempted At ISO8601 Date String>
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    channel_id: <Channel Id Number String>
    lmdb_path: <LMDB Path String>
    network: <Network Name String>
    to_public_key: <Activity Towards Public Key Hex String>
    tokens: <Tokens Number>
    type: <Activity Type String>
  }

*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.attempted_at) {
        return cbk([400, 'ExpectedAttemptedAtDateForEdgeActivity']);
      }

      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAccessKeyForEdgeActivityRecord']);
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedTablePrefixForEdgeActivityRecord']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedSecretKeyForEdgeActivityRecord']);
      }

      if (!args.channel_id) {
        return cbk([400, 'ExpectedChannelIdForEdgeActivity']);
      }

      if (!args.lmdb_path) {
        return cbk([400, 'ExpectedLmdbPathForEdgeActivity']);
      }

      if (!args.network || !chainIds[args.network]) {
        return cbk([400, 'ExpectedNetworkForEdgeActivity']);
      }

      if (!args.to_public_key) {
        return cbk([400, 'ExpectedPublicKeyDestinationForEdgeActivity']);
      }

      if (args.tokens === undefined) {
        return cbk([400, 'ExpectedTokensCountForEdgeActivityRecord']);
      }

      if (!args.type || activityTypes.indexOf(args.type) === notFound) {
        return cbk([400, 'ExpectedKnownEdgeActivityTypeForActivityRecord']);
      }

      return cbk();
    },

    // Chain id
    chain: ['validate', ({}, cbk) => cbk(null, chainIds[args.network])],

    ddb: ['validate', ({}, cbk) => {
      try {
        const db = ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        });

        return cbk(null, db);
      } catch (err) {
        return cbk([500, 'FailedDatabaseInitForEdgeRecord', err]);
      }
    }],

    // Record activity in ddb
    putInDynamodb: ['chain', 'ddb', ({chain, ddb}, cbk) => {
      const db = ddb;
      const edge = `${args.to_public_key}${chain}${args.channel_id}`;
      const table = `${args.aws_dynamodb_table_prefix}-${activityDb}`;

      // Create the row
      const item = {
        edge,
        attempted_at: args.attempted_at,
        tokens: args.tokens,
        type: args.type,
      };

      return putDdbItem({db, item, table}, cbk);
    }],

    // Record activity in lmdb
    putInLmdb: ['chain', ({chain}, cbk) => {
      let recordNumber;

      try {
        const {number} = decrementingNumberForDate({date: args.attempted_at});

        recordNumber = number;
      } catch (err) {
        return cbk([500, 'ExpectedValidEdgeNumber']);
      }

      const keyComponents = [
        args.to_public_key,
        chain,
        args.channel_id,
        recordNumber,
      ];

      try {
        putLmdbItem({
          db: activityDb,
          key: keyComponents.join(''),
          lmdb: lmdb({path: args.lmdb_path}),
          value: {tokens: args.tokens, type: args.type},
        });

        return cbk();
      } catch (err) {
        return cbk([500, 'FailedToRecordEdgeActivity', err]);
      }
    }],
  },
  returnResult({}, cbk));
};

