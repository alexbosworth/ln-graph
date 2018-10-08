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
    alias: <Alias String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_access_key_id: <AWS Access Key Id String>
    aws_secret_access_key: <AWS Secret Access Key String>
    network: <Network Name String>
    public_key: <Node Public Key Hex String>
    [sockets]: [<Socket String>]
    updated_at: <ISO 8601 Date String>
  }

  {
    [rev]: <Node Updated Revision Number>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (args.alias === undefined) {
        return cbk([400, 'ExpectedNodeAliasForNodeUpdateRecording']);
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsDynamodbTablePrefixForNodeUpdate']);
      }

      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessKeyIdForNodeUpdateRecording']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForNodeUpdateRegister']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNodeNetworkForNodeUpdate']);
      }

      if (!args.public_key) {
        return cbk([400, 'ExpectedNodePublicKeyForRegister']);
      }

      if (!!args.sockets && !Array.isArray(args.sockets)) {
        return cbk([400, 'ExpectedSocketsForNodeRegistration']);
      }

      if (!isValidIso8601Date(args.updated_at)) {
        return cbk([400, 'ExpectedValidUpdatedAtForNodeUpdateRecord']);
      }

      return cbk();
    },

    // Db connection
    db: ['validate', ({}, cbk) => {
      try {
        return cbk(null, ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedCreatingDynamoDbForNodeUpdate', err]);
      }
    }],

    // Get existing node
    getNode: ['db', ({db}, cbk) => {
      return getItem({
        db,
        table: `${args.aws_dynamodb_table_prefix}-channels`,
        where: {id: new BN(args.channel_id, decimalBase).toBuffer()},
      },
      cbk);
    }],

    // Create node if necessary
    createNode: ['db', 'getNode', ({db, getNode}, cbk) => {
      // Exit early when there is no need to create the node
      if (!!getNode.item && !!getNode.item.rev) {
        return cbk();
      }

      const fresh = ['key'];
      const table = `${args.aws_dynamodb_table_prefix}-nodes`;
      const sockets = {};

      args.sockets.forEach(n => sockets[n] = true);

      // Create the node row
      const item = {
        alias: args.alias,
        created_at: args.updated_at,
        key: Buffer.from(args.public_key, 'hex'),
        networks: [args.network],
        rev: 1,
        sockets: Object.keys(sockets),
        updated_at: args.updated_at,
      };

      return putItem({db, fresh, item, table}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, item);
      });
    }],

    // Update node if necessary
    updateNode: ['db', 'getNode', ({db, getNode}, cbk) => {
      // Exit early when there is no existing node
      if (!getNode.item || !getNode.item.rev) {
        return cbk();
      }

      // Exit early when an update is out of date
      if (getNode.item.updated_at > args.updated_at) {
        return cbk();
      }

      const changes = {};
      const expect = {rev: getNode.item.rev};
      const table = `${args.aws_dynamodb_table_prefix}-nodes`;
      const where = {key: Buffer.from(args.public_key, 'hex')};

      if (getNode.item.alias !== args.alias) {
        changes.alias = {set: args.alias};
      }

      if (getNode.item.networks.indexOf(args.network) === -1) {
        changes.networks = {add: args.network};
      }

      if (getNode.item.sockets.join() !== args.sockets.join()) {
        changes.sockets = args.sockets;
      }

      if (!Object.keys(changes).length) {
        return cbk();
      }

      changes.rev = {add: 1};
      changes.updated_at = {set: args.updated_at};

      return updateItem({changes, db, expect, table, where}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, {rev: getNode.item.rev + 1});
      });
    }],
  },
  (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    if (!!res.createNode) {
      return cbk(null, {rev: res.createNode.rev});
    }

    if (!!res.updateNode) {
      return cbk(null, {rev: res.updateNode.rev});
    }

    return cbk(null, {});
  });
};

