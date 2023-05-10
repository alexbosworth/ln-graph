const asyncAuto = require('async/auto');
const {rawChanId} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const chainIds = require('./conf/networks').chain_ids;
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {getDdbItem} = require('./../dynamodb');
const {updateDdbItem}= require('./../dynamodb');

/** Mark a channel as being closed

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    close_height: <Close Height Number>
    id: <Standard Format Channel Id String>
    network: <Network Name String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessKeyIdToCloseChannel']);
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsTablePrefixForCloseChannelUpdate']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForCloseChannelUpdate']);
      }

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

    // Channel key
    key: ['chain', 'id', ({chain, id}, cbk) => cbk(null, `${chain}${id}`)],

    // Get the current state of the channel from dynamodb
    getChanFromDdb: ['db', 'key', ({db, key}, cbk) => {
      const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

      return getDdbItem({db, table, where: {key}}, cbk);
    }],

    // Update existing channel in ddb
    updateDdbChan: [
      'db',
      'getChanFromDdb',
      'key',
      ({db, getChanFromDdb, key}, cbk) =>
    {
      // Exit early when there is no open channel to update
      if (!getChanFromDdb || !getChanFromDdb.item) {
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
  },
  returnResult({}, cbk));
};

