const asyncAuto = require('async/auto');
const BN = require('bn.js');
const isValidIso8601Date = require('vali-date');

const {ddb} = require('./../dynamodb');
const {getItem} = require('./../dynamodb');
const {putItem} = require('./../dynamodb');
const {updateItem} = require('./../dynamodb');

const decimalBase = 10;

/** Record a node update to the database

  {
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_access_key_id: <AWS Access Key Id String>
    aws_secret_access_key: <AWS Secret Access Key String>
    capacity: <Capacity Tokens Number>
    channel_id: <Channel Id String>
    [close_height]: <Close Height Number>
    network: <Network Name String>
    [node1_base_fee_mtokens]: <Base Fee Millitokens String>
    [node1_cltv_delta]: <CLTV Delta Number>
    [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
    [node1_is_disabled]: <Policy is Disabled Bool>
    [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    [node1_public_key]: <Policy Public Key String>
    [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
    [node2_base_fee_mtokens]: <Base Fee Millitokens String>
    [node2_cltv_delta]: <CLTV Delta Number>
    [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
    [node2_is_disabled]: <Policy is Disabled Bool>
    [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    [node2_public_key]: <Policy Public Key String>
    [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    transaction_id: <Channel Outpoint Transaction Id String>
    transaction_vout: <Channel Outpoint Transaction Output Index Number>
  }

  @returns via cbk
  {
    [close_height]: <Close Height Number>
    [node1_base_fee_mtokens]: <Base Fee Millitokens String>
    [node1_cltv_delta]: <CLTV Delta Number>
    [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
    [node1_is_disabled]: <Policy is Disabled Bool>
    [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    [node1_public_key]: <Policy Public Key String>
    [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
    [node2_base_fee_mtokens]: <Base Fee Millitokens String>
    [node2_cltv_delta]: <CLTV Delta Number>
    [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
    [node2_is_disabled]: <Policy is Disabled Bool>
    [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
    [node2_public_key]: <Policy Public Key String>
    [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    [rev]: <Channel Revision Number>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsTablePrefixForChannelUpdate']);
      }

      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessKeyIdForChannelUpdate'])
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForChannelUpdate']);
      }

      if (!args.capacity) {
        return cbk([400, 'ExpectedCapacityForChannelUpdate']);
      }

      if (!args.channel_id) {
        return cbk([400, 'ExpectedChannelIdForChannelUpdate']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkForChannelUpdate']);
      }

      if (!args.transaction_id) {
        return cbk([400, 'ExpectedChannelTransactionIdForChannelUpdate']);
      }

      if (args.transaction_vout === undefined) {
        return cbk([400, 'ExpectedChannelTransactionVoutForChannelUpdate']);
      }

      return cbk();
    },

    // Dynamodb
    db: ['validate', ({}, cbk) => {
      try {
        return cbk(null, ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedCreatingDynamoDbForChannelUpdate', err]);
      }
    }],

    // Get the current state of the channel
    getChannel: ['db', ({db}, cbk) => {
      return getItem({
        db,
        table: `${args.aws_dynamodb_table_prefix}-channels`,
        where: {id: new BN(args.channel_id, decimalBase).toBuffer()},
      },
      cbk);
    }],

    // Create update rev
    createUpdate: ['db', 'getChannel', ({db, getChannel}, cbk) => {
      const existing = getChannel.item || {};
      const table = `${args.aws_dynamodb_table_prefix}-channels-history`;

      // First write the history row
      const item = {};

      if (!!args.close_height) {
        if (existing.close_height !== args.close_height) {
          item.close_height = args.close_height;
        }
      }

      if (!!args.node1_base_fee_mtokens) {
        if (existing.node1_base_fee_mtokens !== args.node1_base_fee_mtokens) {
          item.node1_base_fee_mtokens = args.node1_base_fee_mtokens;
        }
      }

      if (args.node1_cltv_delta !== undefined) {
        if (existing.node1_cltv_delta !== args.node1_cltv_delta) {
          item.node1_cltv_delta = args.node1_cltv_delta;
        }
      }

      if (args.node1_fee_rate !== undefined) {
        if (existing.node1_fee_rate !== args.node1_fee_rate) {
          item.node1_fee_rate = args.node1_fee_rate;
        }
      }

      if (args.node1_is_disabled !== undefined) {
        if (existing.node1_is_disabled !== args.node1_is_disabled) {
          item.node1_is_disabled = args.node1_is_disabled;
        }
      }

      if (!!args.node1_min_htlc_mtokens) {
        if (existing.node1_min_htlc_mtokens !== args.node1_min_htlc_mtokens) {
          item.node1_min_htlc_mtokens = args.node1_min_htlc_mtokens;
        }
      }

      if (!!args.node2_base_fee_mtokens) {
        if (existing.node2_base_fee_mtokens !== args.node2_base_fee_mtokens) {
          item.node2_base_fee_mtokens = args.node2_base_fee_mtokens;
        }
      }

      if (args.node2_cltv_delta !== undefined) {
        if (existing.node2_cltv_delta !== args.node2_cltv_delta) {
          item.node2_cltv_delta = args.node2_cltv_delta;
        }
      }

      if (args.node2_fee_rate !== undefined) {
        if (existing.node2_fee_rate !== args.node2_fee_rate) {
          item.node2_fee_rate = args.node2_fee_rate;
        }
      }

      if (args.node2_is_disabled !== undefined) {
        if (existing.node2_is_disabled !== args.node2_is_disabled) {
          item.node2_is_disabled = args.node2_is_disabled;
        }
      }

      if (!!args.node2_min_htlc_mtokens) {
        if (existing.node2_min_htlc_mtokens !== args.node2_min_htlc_mtokens) {
          item.node2_min_htlc_mtokens = args.node2_min_htlc_mtokens;
        }
      }

      // Exit early when there is nothing to update
      if (!Object.keys(item).length) {
        return cbk();
      }

      if (!!args.node1_updated_at) {
        item.node1_updated_at = args.node1_updated_at;
      }

      if (!!args.node2_updated_at) {
        item.node2_updated_at = args.node2_updated_at;
      }

      item.channel_id = new BN(args.channel_id, decimalBase).toBuffer();
      item.rev = !existing.rev ? 1 : existing.rev + 1;

      return putItem({db, item, table}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, item);
      });
    }],

    // Create row if necessary
    createChannel: [
      'createUpdate',
      'db',
      'getChannel',
      ({db, getChannel}, cbk) =>
    {
      // Exit early when there is no need to create the channel
      if (!!getChannel.item && !!getChannel.item.rev) {
        return cbk();
      }

      const fresh = ['id'];
      const table = `${args.aws_dynamodb_table_prefix}-channels`;
      const pubKey1 = args.node1_public_key;
      const pubKey2 = args.node2_public_key;

      // Create the channel row
      const item = {
        id: new BN(args.channel_id, decimalBase).toBuffer(),
        network: args.network,
        node1_base_fee_mtokens: args.node1_base_fee_mtokens,
        node1_cltv_delta: args.node1_cltv_delta,
        node1_fee_rate: args.node1_fee_rate,
        node1_is_disabled: args.node1_is_disabled,
        node1_min_htlc_mtokens: args.node1_min_htlc_mtokens,
        node1_public_key: !pubKey1 ? undefined : Buffer.from(pubKey1, 'hex'),
        node1_updated_at: args.node1_updated_at,
        node2_base_fee_mtokens: args.node2_base_fee_mtokens,
        node2_cltv_delta: args.node2_cltv_delta,
        node2_fee_rate: args.node2_fee_rate,
        node2_is_disabled: args.node2_is_disabled,
        node2_min_htlc_mtokens: args.node2_min_htlc_mtokens,
        node2_public_key: !pubKey2 ? undefined : Buffer.from(pubKey2, 'hex'),
        node2_updated_at: args.node2_updated_at,
        transaction_id: Buffer.from(args.transaction_id, 'hex'),
        transaction_vout: args.transaction_vout,
        rev: 1,
      };

      return putItem({db, fresh, item, table}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, item);
      });
    }],

    // Update existing channel
    updateChannel: [
      'createUpdate',
      'db',
      'getChannel',
      ({createUpdate, db, getChannel}, cbk) =>
    {
      // Exit early when there is no existing channel to update
      if (!createUpdate || !getChannel.item || !getChannel.item.rev) {
        return cbk();
      }

      const changes = {rev: {add: 1}};
      const expect = {rev: getChannel.item.rev};
      const table = `${args.aws_dynamodb_table_prefix}-channels`;
      const where = {id: createUpdate.channel_id};

      Object.keys(createUpdate)
        .filter(attr => createUpdate[attr] !== undefined)
        .filter(attr => attr !== 'channel_id' && attr !== 'rev')
        .forEach(attr => changes[attr] = {set: createUpdate[attr]});

      return updateItem({changes, db, expect, table, where}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk();
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    if (!!res.createChannel) {
      return cbk(null, {rev: 1});
    }

    if (!!res.createUpdate) {
      return cbk(null, {
        close_height: res.createUpdate.close_height,
        node1_base_fee_mtokens: res.createUpdate.node1_base_fee_mtokens,
        node1_cltv_delta: res.createUpdate.node1_cltv_delta,
        node1_fee_rate: res.createUpdate.node1_fee_rate,
        node1_is_disabled: res.createUpdate.node1_is_disabled,
        node1_min_htlc_tokens: res.createUpdate.node1_min_htlc_tokens,
        node1_updated_at: res.createUpdate.node1_updated_at,
        node1_public_key: res.createUpdate.node1_public_key,
        node2_base_fee_mtokens: res.createUpdate.node2_base_fee_mtokens,
        node2_cltv_delta: res.createUpdate.node2_cltv_delta,
        node2_fee_rate: res.createUpdate.node2_fee_rate,
        node2_is_disabled: res.createUpdate.node2_is_disabled,
        node2_min_htlc_tokens: res.createUpdate.node2_min_htlc_tokens,
        node2_public_key: res.createUpdate.node2_public_key,
        node2_updated_at: res.createUpdate.node2_updated_at,
        rev: res.createUpdate.rev,
      });
    }

    return cbk(null, {});
  });
};

