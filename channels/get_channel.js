const asyncAuto = require('async/auto');
const asyncMap = require('async/map');
const {getChannel} = require('ln-service');

const {getChannelRecord} = require('./../records');
const {getChannelRow} = require('./../rows');
const {getNode} = require('./../nodes');
const {returnResult} = require('./../async');
const {setChannelRecord} = require('./../records');
const {updateChannelMetadata} = require('./../rows');

/** Get a channel, using different strategies

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    id: <Standard Format Channel Id String>
    [lmdb_path]: <LMDB Path String>
    [lnd]: <LND Object>
    network: <Network Name String>
  }

  @returns
  {
    [channel] {
      capacity: <Maximum Tokens Number>
      policies: [{
        [alias]: <Cached Node Alias String>
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [color]: <Cached Node Color String>
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
      if (!args.id) {
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

    // Get channel from lmdb
    getChanFromLmdb: ['validate', ({}, cbk) => {
      if (!args.lmdb_path) {
        return cbk();
      }

      try {
        return cbk(null, getChannelRecord({
          id: args.id,
          lmdb_path: args.lmdb_path,
          network: args.network,
        }));
      } catch (err) {
        return cbk([500, 'UnexpectedErrGettingChannelFromChannelRecord', err]);
      }
    }],

    // Get channel from dynamodb
    getChanFromDdb: ['getChanFromLmdb', ({getChanFromLmdb}, cbk) => {
      // Skip Dynamodb when lmdb already returned a result
      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk();
      }

      // Exit early when aws access is not defined
      if (!args.aws_access_key_id) {
        return cbk();
      }

      return getChannelRow({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        id: args.id,
        network: args.network,
      },
      cbk);
    }],

    // Get channel from lnd
    getChanFromLnd: [
      'getChanFromDdb',
      'getChanFromLmdb',
      ({getChanFromDdb, getChanFromLmdb}, cbk) =>
    {
      // Skip getting from lnd when the channel and policies are known from ddb
      if (!!getChanFromDdb && !!getChanFromDdb.channel) {
        const {policies} = getChanFromDdb.channel;

        if (!!policies && !policies.find(n => !n.public_key)) {
          return cbk();
        }
      }

      // Skip getting from lnd when the channel and policies are ok from lmdb
      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        const {policies} = getChanFromLmdb.channel;

        if (!!policies && !policies.find(n => !n.public_key)) {
          return cbk();
        }
      }

      return getChannel({id: args.id, lnd: args.lnd}, cbk);
    }],

    // Final channel details
    gotChannel: [
      'getChanFromDdb',
      'getChanFromLmdb',
      'getChanFromLnd',
      ({getChanFromDdb, getChanFromLmdb, getChanFromLnd}, cbk) =>
    {
      if (!!getChanFromLnd) {
        return cbk(null, {channel: getChanFromLnd});
      }

      if (!!getChanFromDdb && !!getChanFromDdb.channel) {
        const {policies} = getChanFromDdb.channel;

        if (!!policies && !policies.find(n => !n.public_key)) {
          return cbk(null, {channel: getChanFromDdb.channel});
        }
      }

      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk(null, {channel: getChanFromLmdb.channel});
      }

      return cbk([404, 'UnknownChannelForChannelIdAndNetwork']);
    }],

    // Get node details
    getNodes: ['gotChannel', ({gotChannel}, cbk) => {
      const {policies} = gotChannel.channel;

      return asyncMap(policies, (policy, cbk) => {
        // Exit early when an edge peer is unknown
        if (!policy.public_key) {
          return cbk(null, {});
        }

        // Exit early when the alias and color are cached for this channel
        if (!!policy.alias && !!policy.color) {
          return cbk(null, {
            alias: policy.alias,
            color: policy.color,
            public_key: policy.public_key,
          });
        }

        return getNode({
          aws_access_key_id: args.aws_access_key_id,
          aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
          aws_secret_access_key: args.aws_secret_access_key,
          public_key: policy.public_key,
          lmdb_path: args.lmdb_path,
          lnd: args.lnd,
        },
        (err, res) => {
          if (!!err) {
            return cbk(err);
          }

          // Exit early when the node is unknown
          if (!res.node) {
            return cbk(null, {});
          }

          // Exit early when there is no need to the ddb channel node cache
          if (!args.aws_access_key_id) {
            return cbk(null, {
              alias: res.node.alias,
              color: res.node.color,
              public_key: policy.public_key,
            });
          }

          // Update the channel with cached node metadata
          return updateChannelMetadata({
            alias: res.node.alias,
            aws_access_key_id: args.aws_access_key_id,
            aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
            aws_secret_access_key: args.aws_secret_access_key,
            color: res.node.color,
            id: args.id,
            index: policies.findIndex(n => n.public_key === policy.public_key),
            network: args.network,
            public_key: policy.public_key,
          },
          err => {
            if (!!err) {
              return cbk(err);
            }

            return cbk(null, {
              alias: res.node.alias,
              color: res.node.color,
              public_key: policy.public_key,
            });
          });
        });
      },
      cbk);
    }],

    // Channel
    channel: ['gotChannel', 'getNodes', ({gotChannel, getNodes}, cbk) => {
      const {channel} = gotChannel;

      // Treat closed channels as non-existing channels
      if (!!channel.close_height) {
        return cbk([404, 'ActiveChannelNotFound', channel]);
      }

      // Add some node metadata to the channel policies
      const policiesWithNodeDetails = channel.policies.map(policy => {
        const node = getNodes.find(n => n.public_key === policy.public_key);

        return {
          alias: node.alias,
          base_fee_mtokens: policy.base_fee_mtokens,
          cltv_delta: policy.cltv_delta,
          color: node.color,
          fee_rate: policy.fee_rate,
          is_disabled: policy.is_disabled,
          min_htlc_mtokens: policy.min_htlc_mtokens,
          public_key: policy.public_key,
        };
      });

      return cbk(null, {
        channel: {
          capacity: channel.capacity,
          close_height: channel.close_height,
          policies: policiesWithNodeDetails,
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
          updated_at: channel.updated_at,
        },
      });
    }],

    // Update lmdb
    setChanInLmdb: [
      'getChanFromLmdb',
      'gotChannel',
      ({getChanFromLmdb, gotChannel}, cbk) =>
    {
      // Exit early when lmdb is not in use
      if (!args.lmdb_path) {
        return cbk();
      }

      // Exit early when the channel exists in lmdb already
      if (!!getChanFromLmdb && !!getChanFromLmdb.channel) {
        return cbk();
      }

      const {channel} = gotChannel;

      try {
        return cbk(null, setChannelRecord({
          capacity: channel.capacity,
          close_height: channel.close_height,
          id: args.id,
          lmdb_path: args.lmdb_path,
          network: args.network,
          policies: channel.policies,
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
          updated_at: channel.updated_at,
        }));
      } catch (err) {
        return cbk([500, 'FailedToSetChannelRecordWhenGettingChannel', err]);
      }
    }],
  },
  returnResult({of: 'channel'}, cbk));
};

