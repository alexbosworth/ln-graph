const asyncAuto = require('async/auto');
const asyncEachLimit = require('async/eachLimit');
const asyncMapSeries = require('async/mapSeries');
const {shuffle} = require('lodash');
const {take} = require('lodash');

const checkChannelClosed = require('./check_channel_closed');
const {checkLimit} = require('./constants');
const {getChanRecordsForNode} = require('./../records');
const getChannel = require('./get_channel');
const {getChannelRecords} = require('./../records');
const {getChannelRows} = require('./../rows');
const {returnResult} = require('./../async');
const {updateWindowMs} = require('./constants');

const {now} = Date;

/** Get channels for a node

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    [lmdb_path]: <LMDB Path String>
    [lnd]: <LND Object>
    network: <Network Name String>
    public_key: <Public Key Hex String>
  }

  @returns via cbk
  {
    channels: [{
      capacity: <Capacity Tokens Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [alias]: <Alias String>
        [attempted]: <Attempted Result String>
        [attempted_at]: <Attempted ISO 8601 Date String>
        [attempted_tokens]: <Attempted Tokens Number>
        base_fee_mtokens: <Base Fee Millitokens String>
        cltv_delta: <CLTV Delta Number>
        [color]: <Color String>
        fee_rate: <Fee Rate Number>
        is_disabled: <Is Disabled Bool>
        min_htlc_mtokens: <Minimum HTLC Millitokens String>
        public_key: <Public Key Hex String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      updated_at: <Channel Update at ISO 8601 Date String>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id && !args.lmdb_path) {
        return cbk([400, 'ExpectedAwsAccessKeyOrLmdbPath']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkToGetChannelsForNode']);
      }

      if (!args.public_key) {
        return cbk([400, 'ExpectedPublicKeyToGetChannelsForNode']);
      }

      return cbk();
    },

    // Get channels for node from lmdb
    getRecords: ['validate', ({}, cbk) => {
      if (!!args.aws_access_key_id) {
        return cbk();
      }

      try {
        return cbk(null, getChanRecordsForNode({
          lmdb_path: args.lmdb_path,
          network: args.network,
          public_key: args.public_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToGetChannelRecordsForNode', err]);
      }
    }],

    // Get channels for node from dynamodb
    getRows: ['validate', ({}, cbk) => {
      if (!args.aws_access_key_id) {
        return cbk();
      }

      return getChannelRows({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        network: args.network,
        public_key: args.public_key,
      },
      cbk);
    }],

    // Channels for node
    chansForNode: ['getRecords', 'getRows', ({getRecords, getRows}, cbk) => {
      return cbk(null, getRecords || getRows);
    }],

    // Check channels to see if they are closed
    checkClosed: ['chansForNode', ({chansForNode}, cbk) => {
      if (!args.lnd) {
        return cbk();
      }

      const channelsToCheck = take(shuffle(chansForNode.channels), checkLimit);
      const old = new Date(now() - updateWindowMs).toISOString();

      if (!channelsToCheck.length) {
        return cbk();
      }

      return asyncEachLimit(channelsToCheck, checkLimit, (channel, cbk) => {
        if (!!channel.close_height || channel.updated_at > old) {
          return cbk();
        }

        return checkChannelClosed({
          aws_access_key_id: args.aws_access_key_id,
          aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
          aws_secret_access_key: args.aws_secret_access_key,
          id: channel.id,
          lmdb_path: args.lmdb_path,
          lnd: args.lnd,
          network: args.network,
        },
        cbk);
      },
      cbk);
    }],

    // Final channels
    channels: ['chansForNode', ({chansForNode}, cbk) => {
      return asyncMapSeries(chansForNode.channels, (channel, cbk) => {
        if (!!channel.close_height) {
          return cbk();
        }

        const [n1, n2] = channel.policies;

        if (!!n1.public_key && !!n2.public_key && !!n1.color && !!n2.color) {
          return cbk(null, channel);
        }

        return getChannel({
          aws_access_key_id: args.aws_access_key_id,
          aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
          aws_secret_access_key: args.aws_secret_access_key,
          id: channel.id,
          lmdb_path: args.lmdb_path,
          lnd: args.lnd,
          network: args.network,
        },
        (err, res) => {
          if (!!err) {
            const [code] = err;

            return code === 404 ? cbk() : cbk(err);
          }

          // Exit early when this channel is marked as closed
          if (!!res.channel.close_height) {
            return cbk();
          }

          return cbk(null, {
            capacity: channel.capacity,
            close_height: channel.close_height,
            id: channel.id,
            policies: res.channel.policies,
            transaction_id: channel.transaction_id,
            transaction_vout: channel.transaction_vout,
            updated_at: channel.updated_at,
          });
        });
      },
      (err, res) => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, {channels: res.filter(n => !!n)});
      });
    }],
  },
  returnResult({of: 'channels'}, cbk));
};

