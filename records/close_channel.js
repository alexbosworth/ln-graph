const asyncAuto = require('async/auto');
const {rawChanId} = require('bolt07');

const chainIds = require('./conf/networks').chain_ids;
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {getDdbItem} = require('./../dynamodb');
const {getLmdbItem} = require('./../lmdb');
const {lmdb} = require('./../lmdb');
const {returnResult} = require('./../async');
const {updateDdbItem}= require('./../dynamodb');
const {updateLmdbItem} = require('./../lmdb');

/** Mark a channel as being closed

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    close_height: <Close Height Number>
    id: <Standard Format Channel Id String>
    [lmdb_path]: <LMDB Path String>
    network: <Network Name String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (args.close_height === undefined) {
        return cbk([400, 'ExpectedCloseHeightToMarkChannelClosed']);
      }

      if (!args.id) {
        return cbk([400, 'ExpectedChannelIdToMarkChannelClosed']);
      }

      if (!args.network || !chainIds[args.network]) {
        return cbk([400, 'ExpectedValidNetworkForChannelToMarkClosed']);
      }

      return cbk();
    },

    // Chain id for network
    chain: ['validate', ({}, cbk) => cbk(null, chainIds[args.network])],

    // Get the dynamodb database context
    db: ['validate', ({}, cbk) => {
      // Exit early when AWS is not configured
      if (!args.aws_access_key_id) {
        return cbk();
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsTablePrefixForCloseChannelUpdate']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForCloseChannelUpdate']);
      }

      try {
        return cbk(null, ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToGetDdbConnectionToUpdateChannelClose', err]);
      }
    }],

    // The database id for a channel is its raw hex form
    id: ['validate', ({}, cbk) => {
      try {
        return cbk(null, rawChanId({channel: args.id}).id);
      } catch (err) {
        return cbk([400, 'ExpectedValidStandardFormatChannelId', err]);
      }
    }],

    // Get the lmdb database context
    lmdb: ['validate', ({}, cbk) => {
      // Exit early when the lmdb database path is not configured
      if (!args.lmdb_path) {
        return cbk();
      }

      try {
        return cbk(null, lmdb({path: args.lmdb_path}));
      } catch (err) {
        return cbk([500, 'FailedToOpenLmdbForCloseChannelUpdate', err]);
      }
    }],

    // Channel key
    key: ['chain', 'id', ({chain, id}, cbk) => cbk(null, `${chain}${id}`)],

    // Get the current state of the channel from dynamodb
    getChanFromDdb: ['db', 'key', ({db, key}, cbk) => {
      // Exit early when there is no dynamodb configured
      if (!db) {
        return cbk();
      }

      const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

      return getDdbItem({db, table, where: {key}}, cbk);
    }],

    // Get the current state of the channel from lmdb
    getLmdbChan: ['key', 'lmdb', ({key, lmdb}, cbk) => {
      // Exit early when not using lmdb
      if (!lmdb) {
        return cbk();
      }

      try {
        return cbk(null, getLmdbItem({key, lmdb, db: chansDb}));
      } catch (err) {
        return cbk([500, 'FailedToGetChannelFromLmdb', err]);
      }
    }],

    // Update existing channel in ddb
    updateDdbChan: [
      'db',
      'getChanFromDdb',
      'key',
      ({db, getChanFromDdb, key}, cbk) =>
    {
      // Exit early when there is no open channel to update
      if (!db || !getChanFromDdb || !getChanFromDdb.item) {
        return cbk();
      }

      if (!!getChanFromDdb.item.close_height) {
        return cbk();
      }

      return updateDdbItem({
        db,
        changes: {close_height: {set: args.close_height}},
        table: `${args.aws_dynamodb_table_prefix}-${chansDb}`,
        where: {key},
      },
      cbk);
    }],

    // Update existing channel in lmdb
    updateLmdbChannel: [
      'getLmdbChan',
      'key',
      'lmdb',
      ({getLmdbChan, key, lmdb, lmdbChanUpdate}, cbk) =>
    {
      // Exit early when there is no need to update the lmdb channel
      if (!lmdb || !getLmdbChan.item || !getLmdbChan.item.close_height) {
        return cbk();
      }

      const changes = {close_height: {set: args.close_height}};

      try {
        return cbk(null, updateLmdbItem({changes, key, lmdb, db: chansDb}));
      } catch (err) {
        return cbk([500, 'FailedToCloseChannelItemInLmdb', err]);
      }
    }],
  },
  returnResult({}, cbk));
};

