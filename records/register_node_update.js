const asyncAuto = require('async/auto');
const isValidIso8601Date = require('vali-date');
const {returnResult} = require('asyncjs-util');

const changesForNode = require('./changes_for_node');
const {colorLen} = require('./constants');
const {ddb} = require('./../dynamodb');
const {getDdbItem} = require('./../dynamodb');
const networks = require('./conf/networks');
const {nodesDb} = require('./constants');
const {notFound} = require('./constants');
const {pkHexLen} = require('./constants');
const {putDdbItem} = require('./../dynamodb');
const {updateDdbItem} = require('./../dynamodb');

/** Record a node update to the database

  {
    alias: <Alias String>
    color: <Color String>
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
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

      if (!args.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessToRegisterNodeUpdate']);
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsDynamodbTablePrefixForNodeUpdate']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForNodeUpdateRegister']);
      }

      if (!args.color || args.color.length !== colorLen) {
        return cbk([400, 'ExpectedNodeColorForNodeUpdate']);
      }

      if (!args.network || !networks.chain_ids[args.network]) {
        return cbk([400, 'ExpectedNodeNetworkForNodeUpdate']);
      }

      if (!args.public_key || args.public_key.length !== pkHexLen) {
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

    // Chain for network
    chain: ['validate', ({}, cbk) => {
      return cbk(null, networks.chain_ids[args.network]);
    }],

    // Db connection
    ddb: ['validate', ({}, cbk) => {
      const key = args.aws_access_key_id;
      const secret = args.aws_secret_access_key;

      try {
        return cbk(null, ddb({access_key_id: key, secret_access_key: secret}));
      } catch (err) {
        return cbk([500, 'FailedCreatingDynamoDbForNodeUpdate', err]);
      }
    }],

    // Get existing node
    getDdbNode: ['ddb', ({ddb}, cbk) => {
      return getDdbItem({
        db: ddb,
        table: `${args.aws_dynamodb_table_prefix}-${nodesDb}`,
        where: {key: args.public_key},
      },
      cbk);
    }],

    // Node
    node: ['chain', ({chain}, cbk) => {
      const sockets = {};

      (args.sockets || []).forEach(n => sockets[n] = true);

      const uniqueSockets = Object.keys(sockets);

      const item = {
        alias: args.alias,
        chains: [chain],
        color: args.color,
        created_at: args.updated_at,
        key: args.public_key,
        rev: [args].length,
        sockets: uniqueSockets.length ? uniqueSockets : undefined,
        updated_at: args.updated_at,
      };

      return cbk(null, item);
    }],

    // Create node if necessary
    createDdbNode: [
      'ddb',
      'getDdbNode',
      'node',
      ({ddb, getDdbNode, node}, cbk) =>
    {
      // Exit early when there is no need to create the node
      if (!!getDdbNode.item && !!getDdbNode.item.rev) {
        return cbk();
      }

      const db = ddb;
      const fresh = ['key'];
      const item = node;
      const table = `${args.aws_dynamodb_table_prefix}-${nodesDb}`;

      return putDdbItem({db, fresh, item, table}, err => cbk(err, item));
    }],

    // Update node if necessary
    updateDdbNode: [
      'chain',
      'ddb',
      'getDdbNode',
      ({chain, ddb, getDdbNode}, cbk) =>
    {
      const {changes} = changesForNode({
        chain,
        existing: getDdbNode.item,
        update: {
          alias: args.alias,
          color: args.color,
          sockets: args.sockets,
          updated_at: args.updated_at,
        },
      });

      if (!changes) {
        return cbk();
      }

      const db = ddb;
      const expect = {rev: getDdbNode.item.rev};
      const table = `${args.aws_dynamodb_table_prefix}-${nodesDb}`;
      const where = {key: args.public_key};

      return updateDdbItem({changes, expect, table, where, db: ddb}, err => {
        if (!!err) {
          return cbk(err);
        }

        return cbk(null, {rev: getDdbNode.item.rev + [args.length]});
      });
    }],

    // Updated (from the ddb perspective)
    updated: [
      'createDdbNode',
      'getDdbNode',
      'node',
      'updateDdbNode',
      ({createDdbNode, getDdbNode, node, updateDdbNode}, cbk) =>
    {
      if (!!createDdbNode) {
        return cbk(null, {rev: createDdbNode.rev});
      }

      if (!!updateDdbNode) {
        return cbk(null, {rev: updateDdbNode.rev});
      }

      return cbk(null, {});
    }],
  },
  returnResult({of: 'updated'}, cbk));
};

