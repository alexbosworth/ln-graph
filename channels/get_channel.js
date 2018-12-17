const asyncAuto = require('async/auto');
const {chanNumber} = require('bolt07');
const {getChannel} = require('ln-service');
const {rawChanId}  = require('bolt07');

const {getChannelRecord} = require('./../records');
const {getChannelRow} = require('./../rows');
const {returnResult} = require('./../async');
const {setChannelRecord} = require('./../records');

/** Get a channel, using different strategies

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    channel: <Channel Id String>
    [lmdb_path]: <LMDB Path String>
    [lnd]: <LND Object>
    network: <Network Name String>
  }

  @returns
  {
    [channel] {
      capacity: <Maximum Tokens Number>
      [close_height]: <Close Height Number>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value Number>
        [public_key]: <Node Public Key String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      [updated_at]: <Channel Last Updated At ISO 8601 Date String>
    }
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.channel) {
        return cbk([400, 'ExpectedChannelIdToGetChannel']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkNameForChannel']);
      }

      if (!args.aws_access_key_id && !args.lmdb_path && !args.lnd) {
        return cbk([400, 'ExpectedAwsOrLmdbOrLndForChannelLookup']);
      }

      return cbk();
    },

    // Raw channel id
    id: ['validate', ({}, cbk) => {
      try {
        return cbk(null, rawChanId({channel: args.channel}).id);
      } catch (err) {
        return cbk([400, 'ExpectedValidChannelIdToGetChannelDetails']);
      }
    }],

    // Get channel from lmdb
    getChanFromLmdb: ['id', ({id}, cbk) => {
      if (!args.lmdb_path) {
        return cbk();
      }

      try {
        return cbk(null, getChannelRecord({
          id,
          lmdb_path: args.lmdb_path,
          network: args.network,
        }));
      } catch (err) {
        return cbk([500, 'UnexpectedErrorGettingChannelFromChannelRecord']);
      }
    }],

    // Get channel from dynamodb
    getChanFromDdb: ['getChanFromLmdb', 'id', ({getChanFromLmdb, id}, cbk) => {
      // Skip Dynamodb when lmdb already returned a result
      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk();
      }

      // Exit early when aws access is not defined
      if (!args.aws_access_key_id) {
        return cbk();
      }

      return getChannelRow({
        id,
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        network: args.network,
      },
      cbk);
    }],

    // Get channel from lnd
    getChanFromLnd: [
      'getChanFromDdb',
      'getChanFromLmdb',
      'id',
      ({getChanFromDdb, getChanFromLmdb, id}, cbk) =>
    {
      if (!!getChanFromDdb && !!getChanFromDdb.channel) {
        return cbk();
      }

      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk();
      }

      try {
        return getChannel({id: chanNumber({id}).number, lnd: args.lnd}, cbk);
      } catch (err) {
        return cbk([500, 'FailedToGetChannelNumberWhenGettingChannel', err]);
      }
    }],

    // Final channel details
    gotChannel: [
      'getChanFromDdb',
      'getChanFromLmdb',
      'getChanFromLnd',
      ({getChanFromLmdb, getChanFromDdb, getChanFromLnd}, cbk) =>
    {
      if (!!getChanFromLnd) {
        return cbk(null, {channel: getChanFromLnd});
      }

      if (!!getChanFromDdb && !!getChanFromDdb.channel) {
        return cbk(null, {channel: getChanFromDdb.channel});
      }

      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk(null, {channel: getChanFromLmdb.channel});
      }

      return cbk([404, 'UnknownChannelForChannelIdAndNetwork']);
    }],

    // Update lmdb
    setChanInLmdb: [
      'getChanFromLmdb',
      'gotChannel',
      ({getChanFromLmdb, gotChannel}, cbk) =>
    {
      if (!args.lmdb_path) {
        return cbk();
      }

      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk();
      }

      const {channel} = gotChannel;

      try {
        return cbk(null, setChannelRecord({
          capacity: channel.capacity,
          close_height: channel.close_height,
          id: channel.id,
          lmdb_path: args.lmdb_path,
          network: args.network,
          policies: channel.policies,
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
          updated_at: channel.updated_at,
        }));
      } catch (err) {
        return cbk([500, 'FailedToSetChannelRecordWhenGettingChannel']);
      }
    }],
  },
  returnResult({of: 'gotChannel'}, cbk));
};

