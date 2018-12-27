const asyncAuto = require('async/auto');

const {chainId} = require('./../chains');
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {returnResult} = require('./../async');
const {updateDdbItem} = require('./../dynamodb');

/** Mark a channel as updated

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    id: <Channel Id to Check
    network: <Network Name String>
    updated_at: <Updated At ISO 8601 Date String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessKeyIdToMarkChannelUpdated']);
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsTablePrefixToMarkChannelUpdated']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyToMarkChannelUpdated']);
      }

      if (!args.id) {
        return cbk([400, 'ExpectedIdToMarkChannelUpdated']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkToMarkChannelUpdated']);
      }

      return cbk();
    },

    // Chain id
    chain: ['validate', ({}, cbk) => {
      try {
        return cbk(null, chainId({network: args.network}).chain_id);
      } catch (err) {
        return cbk([400, 'ExpectedValidNetworkToMarkChannelUpdated', err]);
      }
    }],

    // Get the dynamodb database context
    db: ['validate', ({}, cbk) => {
      try {
        return cbk(null, ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToGetDdbConnectionForChannelUpdate', err]);
      }
    }],

    // Update channel updated_at to avoid re-checking again too soon
    update: ['chain', 'db', ({chain, db}, cbk) => {
      return updateDdbItem({
        db,
        changes: {updated_at: {set: args.updated_at}},
        table: `${args.aws_dynamodb_table_prefix}-${chansDb}`,
        where: {key: `${chain}${args.id}`},
      },
      cbk);
    }],
  },
  returnResult({}, cbk));
};

