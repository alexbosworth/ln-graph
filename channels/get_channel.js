const asyncAuto = require('async/auto');
const asyncEachSeries = require('async/eachSeries');
const asyncMap = require('async/map');
const {getChannel} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {getChannelRow} = require('./../rows');
const {getNode} = require('./../nodes');
const {updateChannel} = require('./../records');
const {updateChannelRowDetails} = require('./../rows');
const {updateChannelMetadata} = require('./../rows');

const {isArray} = Array;

/** Get a channel, using different strategies

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    id: <Standard Format Channel Id String>
    [lnd]: <LND Object>
    network: <Network Name String>
  }

  @returns via cbk
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
      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessIdToGetChannel']);
      }

      if (!args.id) {
        return cbk([400, 'ExpectedChannelIdToGetChannel']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkNameForChannel']);
      }

      return cbk();
    },

    // Get channel from dynamodb
    getChanFromDdb: ['validate', ({}, cbk) => {
      return getChannelRow({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        id: args.id,
        network: args.network,
      },
      cbk);
    }],

    // Determine if the channel in ddb is complete
    hasDdbChan: ['getChanFromDdb', ({getChanFromDdb}, cbk) => {
      // Exit early when there is no ddb row
      if (!getChanFromDdb || !getChanFromDdb.channel) {
        return cbk();
      }

      const {policies} = getChanFromDdb.channel;

      const hasCapacity = getChanFromDdb.channel.capacity !== undefined;
      const hasPolicies = !!policies && !policies.find(n => !n.public_key);

      return cbk(null, hasCapacity && hasPolicies);
    }],

    // Get channel from lnd
    getChanFromLnd: ['hasDdbChan', ({hasDdbChan}, cbk) => {
      // Skip getting from lnd when the channel and policies are known from ddb
      if (!!hasDdbChan) {
        return cbk();
      }

      if (!args.lnd) {
        return cbk([404, 'ChannelRecordNotFound']);
      }

      return getChannel({id: args.id, lnd: args.lnd}, cbk);
    }],

    // Update channel record with the freshest lnd data if appropriate
    updateChannelRecord: ['getChanFromLnd', ({getChanFromLnd}, cbk) => {
      // Exit early when there is no channel to update
      if (!getChanFromLnd) {
        return cbk();
      }

      const {policies} = getChanFromLnd;

      return asyncEachSeries(policies, (policy, cbk) => {
        const other = policies.find(n => n.public_key !== policy.public_key);

        return updateChannel({
          base_fee_mtokens: policy.base_fee_mtokens,
          capacity: getChanFromLnd.capacity,
          id: args.id,
          cltv_delta: policy.cltv_delta,
          fee_rate: policy.fee_rate,
          is_disabled: policy.is_disabled,
          min_htlc_mtokens: policy.min_htlc_mtokens,
          network: args.network,
          public_keys: [policy.public_key, (other || {}).public_key],
          transaction_id: getChanFromLnd.transaction_id,
          transaction_vout: getChanFromLnd.transaction_vout,
          updated_at: getChanFromLnd.updated_at,
        },
        cbk);
      },
      cbk);
    }],

    // Update channel row with the freshest lnd data if appropriate
    updateChannelRow: [
      'getChanFromDdb',
      'getChanFromLnd',
      'hasDdbChan',
      ({getChanFromDdb, getChanFromLnd, hasDdbChan}, cbk) =>
    {
      // Exit early when there is no channel to update
      if (!getChanFromDdb || !getChanFromDdb.channel) {
        return cbk();
      }

      // Exit early when there is no need to update the channel in ddb
      if (!getChanFromLnd) {
        return cbk();
      }

      const channel = getChanFromLnd;
      const existing = getChanFromDdb.channel;

      return updateChannelRowDetails({
        aws: {
          aws_access_key_id: args.aws_access_key_id,
          aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
          aws_secret_access_key: args.aws_secret_access_key,
        },
        channel: {
          capacity: channel.capacity,
          policies: channel.policies,
          transaction_id: channel.transaction_id,
          transaction_vout: channel.transaction_vout,
          updated_at: channel.updated_at,
        },
        existing: {
          capacity: existing.capacity,
          policies: existing.policies,
          transaction_id: existing.transaction_id,
          transaction_vout: existing.transaction_vout,
          updated_at: existing.updated_at,
        },
        id: args.id,
        network: args.network,
      },
      cbk);
    }],

    // Final channel details
    gotChannel: [
      'getChanFromDdb',
      'getChanFromLnd',
      ({getChanFromDdb, getChanFromLnd}, cbk) =>
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
          lnd: args.lnd,
        },
        (err, res) => {
          // Exit early when the node is unknown
          if (isArray(err)) {
            const [code] = err;

            if (code === 404) {
              return cbk(null, {});
            }
          }

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
        const publicKey = policy.public_key;

        const node = getNodes.find(n => n.public_key === publicKey) || {};

        return {
          alias: node.alias,
          base_fee_mtokens: policy.base_fee_mtokens,
          cltv_delta: policy.cltv_delta,
          color: node.color,
          fee_rate: policy.fee_rate,
          is_disabled: policy.is_disabled,
          min_htlc_mtokens: policy.min_htlc_mtokens,
          public_key: publicKey,
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
  },
  returnResult({of: 'channel'}, cbk));
};

