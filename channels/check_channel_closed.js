const asyncAuto = require('async/auto');
const {getChannel} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {closeChannel} = require('./../records');
const {markChannelUpdated} = require('./../rows');
const {unknownCloseHeight} = require('./constants');

/** Check if a channel is closed and update it as closed if it is

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    id: <Standard Channel Id String>
    lnd: <LND Object>
    network: <Network Name String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsForCloseChannelCheck']);
      }

      if (!args.id) {
        return cbk([400, 'ExpectedIdForChannelCloseCheck']);
      }

      if (!args.lnd) {
        return cbk([400, 'ExpectedLndForChannelCloseCheck']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkForChannelCloseCheck']);
      }

      return cbk();
    },

    // Get the channel from lnd
    getChannel: ['validate', ({}, cbk) => {
      return getChannel({id: args.id, lnd: args.lnd}, (err, res) => {
        // An error is expected for close channel actions
        if (!err) {
          return cbk(null, {updated_at: new Date().toISOString()});
        }

        if (!Array.isArray(err)) {
          return cbk([500, 'UnexpectedErrorCodeCheckingChannel']);
        }

        const [code] = err;

        // Either the channel or 404 is expected
        if (code !== 404) {
          return cbk(err);
        }

        return cbk(null, {close_height: unknownCloseHeight});
      });
    }],

    // Mark channel as closed
    markChannelClosed: ['getChannel', ({getChannel}, cbk) => {
      // Exit early when there is no close information
      if (!getChannel.close_height) {
        return cbk();
      }

      return closeChannel({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        close_height: unknownCloseHeight,
        id: args.id,
        network: args.network,
      },
      cbk);
    }],

    // Update channel updated_at to avoid re-checking again too soon
    update: ['getChannel', ({getChannel}, cbk) => {
      // Exit early when there is no close information
      if (!!getChannel.close_height || !getChannel.updated_at) {
        return cbk();
      }

      return markChannelUpdated({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        id: args.id,
        network: args.network,
        updated_at: getChannel.updated_at,
      },
      cbk);
    }],
  },
  returnResult({}, cbk));
};
