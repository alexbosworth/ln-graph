const asyncAuto = require('async/auto');
const asyncEach = require('async/each');
const asyncMap = require('async/map');
const {rawChanId} = require('bolt07');

const {chainId} = require('./../chains');
const {chanIdHexLen} = require('./constants');
const {chansDb} = require('./constants');
const channelWithUpdates = require('./channel_with_updates');
const {ddb} = require('./../dynamodb');
const {decBase} = require('./constants');
const {decrementingNumberForDate} = require('./../dates');
const {getDdbItem} = require('./../dynamodb');
const {getLmdbItem} = require('./../lmdb');
const {lmdb} = require('./../lmdb');
const {nodeChannelsDb} = require('./constants');
const {nodeNumbers} = require('./constants');
const {nodesDb} = require('./constants');
const {putDdbItem} = require('./../dynamodb');
const {putLmdbItem} = require('./../lmdb');
const {returnResult} = require('./../async');
const {updateChannelMetadata} = require('./../rows');
const {updateDdbItem} = require('./../dynamodb');
const {updateLmdbItem} = require('./../lmdb');
const {updatesDb} = require('./constants');

/** Record a node update to the database

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    capacity: <Capacity Tokens Number>
    id: <Standard Format Channel Id String>
    [lmdb_path]: <LMDB Database Path>
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
    updated_at: <Updated At ISO 8601 Date String>
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Update attributes
    attributeUpdates: cbk => {
      return cbk(null, {
        node1_base_fee_mtokens: args.node1_base_fee_mtokens,
        node1_cltv_delta: args.node1_cltv_delta,
        node1_fee_rate: args.node1_fee_rate,
        node1_is_disabled: args.node1_is_disabled,
        node1_min_htlc_mtokens: args.node1_min_htlc_mtokens,
        node1_public_key: args.node1_public_key,
        node1_updated_at: args.node1_updated_at,
        node2_base_fee_mtokens: args.node2_base_fee_mtokens,
        node2_cltv_delta: args.node2_cltv_delta,
        node2_fee_rate: args.node2_fee_rate,
        node2_is_disabled: args.node2_is_disabled,
        node2_min_htlc_mtokens: args.node2_min_htlc_mtokens,
        node2_public_key: args.node2_public_key,
        node2_updated_at: args.node2_updated_at,
      });
    },

    // Check arguments
    validate: cbk => {
      if (args.capacity === undefined) {
        return cbk([400, 'ExpectedCapacityForChannelUpdate']);
      }

      if (!args.id) {
        return cbk([400, 'ExpectedChannelIdForChannelUpdate']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkForChannelUpdate']);
      }

      if (!args.node1_updated_at && !args.node2_updated_at) {
        return cbk([400, 'ExpectedUpdateTimeForChannelUpdate']);
      }

      if (!args.transaction_id) {
        return cbk([400, 'ExpectedChannelTransactionIdForChannelUpdate']);
      }

      if (args.transaction_vout === undefined) {
        return cbk([400, 'ExpectedChannelTransactionVoutForChannelUpdate']);
      }

      return cbk();
    },

    // Chain for network
    chain: ['validate', ({}, cbk) => {
      try {
        return cbk(null, chainId({network: args.network}).chain_id);
      } catch (err) {
        return cbk([400, 'ExpectedValidNetworkToRegisterChannelUpdate']);
      }
    }],

    // Get the dynamodb database context
    db: ['validate', ({}, cbk) => {
      // Exit early when AWS is not configured
      if (!args.aws_access_key_id) {
        return cbk();
      }

      if (!args.aws_dynamodb_table_prefix) {
        return cbk([400, 'ExpectedAwsTablePrefixForChannelUpdate']);
      }

      if (!args.aws_secret_access_key) {
        return cbk([400, 'ExpectedAwsSecretAccessKeyForChannelUpdate']);
      }

      try {
        return cbk(null, ddb({
          access_key_id: args.aws_access_key_id,
          secret_access_key: args.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToGetDdbConnectionForChannelUpdate', err]);
      }
    }],

    // Raw channel id for the database
    id: ['validate', ({}, cbk) => {
      try {
        return cbk(null, rawChanId({channel: args.id}).id);
      } catch (err) {
        return cbk([400, 'ExpectedValidChannelIdToRegisterChanUpdate', err]);
      }
    }],

    // Get the lmdb database context
    lmdb: ['validate', ({}, cbk) => {
      // Exit early when the lmdb database path is not configured
      if (!args.lmdb_path) {
        return cbk();
      }

      try {
        return cbk(null, lmdb({path: args.lmdb_path}));
      } catch (err) {
        return cbk([500, 'FailedToOpenLmdbForChannelUpdate', err]);
      }
    }],

    // Determine the updated at time
    updatedAt: ['validate', ({}, cbk) => {
      const dates = [args.node1_updated_at, args.node2_updated_at];

      const [updatedAt] = dates.filter(n => !!n).sort().reverse();

      if (!updatedAt) {
        return cbk([400, 'ExpectedNodePolicyUpdateTime']);
      }

      return cbk(null, updatedAt);
    }],

    // Channel key
    key: ['chain', 'id', ({chain, id}, cbk) => cbk(null, `${chain}${id}`)],

    // Get the current state of the channel from dynamodb
    getChanFromDdb: ['db', 'key', ({db, key}, cbk) => {
      // Exit early when there is no dynamodb configured
      if (!db) {
        return cbk();
      }

      return getDdbItem({
        db,
        table: `${args.aws_dynamodb_table_prefix}-${chansDb}`,
        where: {key},
      },
      cbk);
    }],

    // Check to see if this update was already recorded
    getUpdateFromDdb: [
      'db',
      'key',
      'updatedAt',
      ({db, key, updatedAt}, cbk) =>
    {
      // Exit early when there is no dynamodb configured
      if (!db) {
        return cbk();
      }

      return getDdbItem({
        db,
        table: `${args.aws_dynamodb_table_prefix}-${updatesDb}`,
        where: {key, updated_at: updatedAt},
      },
      cbk);
    }],

    // Get the current state of the channel from lmdb
    getChanFromLmdb: ['key', 'lmdb', ({key, lmdb}, cbk) => {
      // Exit early when not using lmdb
      if (!lmdb) {
        return cbk();
      }

      try {
        return cbk(null, getLmdbItem({key, lmdb, db: chansDb}));
      } catch (err) {
        return cbk([500, 'FailedToGetChannelFromLmdb', err]);
      }
    }],

    // Check to see if this update was already recorded
    getUpdateFromLmdb: [
      'key',
      'lmdb',
      'updatedAt',
      ({key, lmdb, updatedAt}, cbk) =>
    {
      // Exit early when lmdb is not configured
      if (!lmdb) {
        return cbk();
      }

      let updateNumber;

      try {
        updateNumber = decrementingNumberForDate({date: updatedAt}).number;
      } catch (err) {
        return cbk([500, 'FailedToDeriveUpdateNumberLookingForUpdate', err]);
      }

      return cbk(null, getLmdbItem({
        lmdb,
        db: updatesDb,
        key: `${key}${updateNumber}`,
      }));
    }],

    // Ddb channel update row
    ddbChanUpdate: [
      'attributeUpdates',
      'getChanFromDdb',
      ({attributeUpdates, getChanFromDdb}, cbk) =>
    {
      if (!getChanFromDdb) {
        return cbk();
      }

      try {
        return cbk(null, channelWithUpdates({
          item: getChanFromDdb.item || {},
          update: attributeUpdates,
        }));
      } catch (err) {
        return cbk([500, 'FailedToDeriveDdbChannelWithUpdates', err]);
      }
    }],

    // Lmdb channel update row
    lmdbChanUpdate: [
      'attributeUpdates',
      'getChanFromLmdb',
      ({attributeUpdates, getChanFromLmdb}, cbk) =>
    {
      if (!getChanFromLmdb) {
        return cbk();
      }

      try {
        return cbk(null, channelWithUpdates({
          item: getChanFromLmdb.item || {},
          update: attributeUpdates,
        }));
      } catch (err) {
        return cbk([500, 'FailedToDeriveLmdbChannelWithUpdates', err]);
      }
    }],

    // Put the channel update in dynamodb
    createDdbUpdate: [
      'db',
      'ddbChanUpdate',
      'getUpdateFromDdb',
      'key',
      'updatedAt',
      'updateDdbChan',
      ({db, ddbChanUpdate, getUpdateFromDdb, key, updatedAt}, cbk) =>
    {
      // Exit early when there's no need to create a history record
      if (!db || !ddbChanUpdate || !ddbChanUpdate.updates) {
        return cbk();
      }

      if (!getUpdateFromDdb || !!getUpdateFromDdb.item) {
        return cbk();
      }

      const {updates} = ddbChanUpdate;

      const item = {
        key,
        node1_base_fee_mtokens: updates.node1_base_fee_mtokens,
        node1_cltv_delta: updates.node1_cltv_delta,
        node1_fee_rate: updates.node1_fee_rate,
        node1_is_disabled: updates.node1_is_disabled,
        node1_min_htlc_mtokens: updates.node1_min_htlc_mtokens,
        node1_public_key: updates.node1_public_key,
        node1_updated_at: updates.node1_updated_at,
        node2_base_fee_mtokens: updates.node2_base_fee_mtokens,
        node2_cltv_delta: updates.node2_cltv_delta,
        node2_fee_rate: updates.node2_fee_rate,
        node2_is_disabled: updates.node2_is_disabled,
        node2_min_htlc_mtokens: updates.node2_min_htlc_mtokens,
        node2_public_key: updates.node2_public_key,
        node2_updated_at: updates.node2_updated_at,
        updated_at: updatedAt,
      };

      const table = `${args.aws_dynamodb_table_prefix}-${updatesDb}`;

      return putDdbItem({db, item, table}, cbk);
    }],

    // Put the channel update in lmdb
    createLmdbUpdate: [
      'getUpdateFromLmdb',
      'key',
      'lmdb',
      'lmdbChanUpdate',
      'updatedAt',
      ({getUpdateFromLmdb, key, lmdb, lmdbChanUpdate, updatedAt}, cbk) =>
    {
      // Exit early when writing the update is not required
      if (!lmdb || !lmdbChanUpdate || !lmdbChanUpdate.updates) {
        return cbk();
      }

      if (!getUpdateFromLmdb || !!getUpdateFromLmdb.item) {
        return cbk();
      }

      let updateNumber;
      const {updates} = lmdbChanUpdate;

      try {
        updateNumber = decrementingNumberForDate({date: updatedAt}).number;
      } catch (err) {
        return cbk([500, 'FailedToDeriveUpdateNumberForUpdateDate', err]);
      }

      try {
        return cbk(null, putLmdbItem({
          lmdb,
          db: updatesDb,
          key: `${key}${updateNumber}`,
          value: {
            node1_base_fee_mtokens: updates.node1_base_fee_mtokens,
            node1_cltv_delta: updates.node1_cltv_delta,
            node1_fee_rate: updates.node1_fee_rate,
            node1_is_disabled: updates.node1_is_disabled,
            node1_min_htlc_mtokens: updates.node1_min_htlc_mtokens,
            node1_public_key: updates.node1_public_key,
            node1_updated_at: updates.node1_updated_at,
            node2_base_fee_mtokens: updates.node2_base_fee_mtokens,
            node2_cltv_delta: updates.node2_cltv_delta,
            node2_fee_rate: updates.node2_fee_rate,
            node2_is_disabled: updates.node2_is_disabled,
            node2_min_htlc_mtokens: updates.node2_min_htlc_mtokens,
            node2_public_key: updates.node2_public_key,
            node2_updated_at: updates.node2_updated_at,
          },
        }));
      } catch (err) {
        return cbk([500, 'FailedToPutLmdbItemWhenRegisteringChanUpdate', err]);
      }
    }],

    // Create ddb row if necessary
    createDdbChan: [
      'db',
      'ddbChanUpdate',
      'getChanFromDdb',
      'key',
      'updatedAt',
      ({db, ddbChanUpdate, getChanFromDdb, key, updatedAt}, cbk) =>
    {
      // Exit early when there is no need to create the channel
      if (!db || !getChanFromDdb || !ddbChanUpdate) {
        return cbk();
      }

      if (!!getChanFromDdb.item || !ddbChanUpdate.updated) {
        return cbk();
      }

      return putDdbItem({
        db,
        fresh: ['key'],
        item: {
          key,
          capacity: args.capacity,
          node1_base_fee_mtokens: ddbChanUpdate.updated.node1_base_fee_mtokens,
          node1_cltv_delta: ddbChanUpdate.updated.node1_cltv_delta,
          node1_fee_rate: ddbChanUpdate.updated.node1_fee_rate,
          node1_is_disabled: ddbChanUpdate.updated.node1_is_disabled,
          node1_min_htlc_mtokens: ddbChanUpdate.updated.node1_min_htlc_mtokens,
          node1_public_key: ddbChanUpdate.updated.node1_public_key,
          node1_updated_at: ddbChanUpdate.updated.node1_updated_at,
          node2_base_fee_mtokens: ddbChanUpdate.updated.node2_base_fee_mtokens,
          node2_cltv_delta: ddbChanUpdate.updated.node2_cltv_delta,
          node2_fee_rate: ddbChanUpdate.updated.node2_fee_rate,
          node2_is_disabled: ddbChanUpdate.updated.node2_is_disabled,
          node2_min_htlc_mtokens: ddbChanUpdate.updated.node2_min_htlc_mtokens,
          node2_public_key: ddbChanUpdate.updated.node2_public_key,
          node2_updated_at: ddbChanUpdate.updated.node2_updated_at,
          transaction_id: args.transaction_id,
          transaction_vout: args.transaction_vout,
          updated_at: updatedAt,
        },
        table: `${args.aws_dynamodb_table_prefix}-${chansDb}`,
      },
      cbk);
    }],

    // Create lmdb row if necessary
    createLmdbChan: [
      'chain',
      'getChanFromLmdb',
      'key',
      'lmdb',
      'lmdbChanUpdate',
      ({chain, getChanFromLmdb, key, lmdb, lmdbChanUpdate}, cbk) =>
    {
      // Exit early when there is no need to create the lmdb channel
      if (!lmdb || !lmdbChanUpdate || !getChanFromLmdb) {
        return cbk();
      }

      if (!lmdbChanUpdate.updated || !!getChanFromLmdb.item) {
        return cbk();
      }

      const {updated} = lmdbChanUpdate;

      try {
        putLmdbItem({
          key,
          lmdb,
          db: chansDb,
          fresh: ['key'],
          value: {
            capacity: args.capacity,
            node1_base_fee_mtokens: updated.node1_base_fee_mtokens,
            node1_cltv_delta: updated.node1_cltv_delta,
            node1_fee_rate: updated.node1_fee_rate,
            node1_is_disabled: updated.node1_is_disabled,
            node1_min_htlc_mtokens: updated.node1_min_htlc_mtokens,
            node1_public_key: updated.node1_public_key,
            node1_updated_at: updated.node1_updated_at,
            node2_base_fee_mtokens: updated.node2_base_fee_mtokens,
            node2_cltv_delta: updated.node2_cltv_delta,
            node2_fee_rate: updated.node2_fee_rate,
            node2_is_disabled: updated.node2_is_disabled,
            node2_min_htlc_mtokens: updated.node2_min_htlc_mtokens,
            node2_public_key: updated.node2_public_key,
            node2_updated_at: updated.node2_updated_at,
            transaction_id: args.transaction_id,
            transaction_vout: args.transaction_vout,
          },
        });

        const value = {};

        // Create links from the pubkeys to the channel id
        nodeNumbers
          .map(n => lmdbChanUpdate.updates[`node${n}_public_key`])
          .filter(n => !!n)
          .map(pubKey => ({lmdb, db: nodeChannelsDb, key: `${pubKey}${key}`}))
          .forEach(({db, key, lmdb}) => putLmdbItem({db, key, lmdb, value}));

        return cbk();
      } catch (err) {
        return cbk([500, 'FailedToPutChannelUpdateItemInLmdb', err]);
      }
    }],

    // Update existing channel in ddb
    updateDdbChan: [
      'db',
      'ddbChanUpdate',
      'getChanFromDdb',
      'key',
      'updatedAt',
      ({db, ddbChanUpdate, getChanFromDdb, key, updatedAt}, cbk) =>
    {
      // Exit early when there is no existing channel to update
      if (!db || !getChanFromDdb || !ddbChanUpdate) {
        return cbk();
      }

      if (!getChanFromDdb.item || !ddbChanUpdate.updates) {
        return cbk();
      }

      if (!getChanFromDdb.item.updated_at) {
        return cbk();
      }

      const changes = {};
      const expect = {updated_at: getChanFromDdb.item.updated_at};
      const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

      if (!getChanFromDdb.item.capacity) {
        changes.capacity = {set: args.capacity};
      }

      Object.keys(ddbChanUpdate.updates)
        .filter(attr => ddbChanUpdate.updates[attr] !== undefined)
        .forEach(attr => changes[attr] = {set: ddbChanUpdate.updates[attr]});

      Object.keys(ddbChanUpdate.updates)
        .filter(attr => ddbChanUpdate.updates[attr] === '')
        .forEach(attr => changes[attr] = {remove: true});

      return updateDdbItem({changes, db, expect, table, where: {key}}, cbk);
    }],

    // Update existing channel in lmdb
    updateLmdbChannel: [
      'getChanFromLmdb',
      'key',
      'lmdb',
      'lmdbChanUpdate',
      ({getChanFromLmdb, key, lmdb, lmdbChanUpdate}, cbk) =>
    {
      // Exit early when there is no need to update the lmdb channel
      if (!lmdb || !getChanFromLmdb || !lmdbChanUpdate) {
        return cbk();
      }

      if (!getChanFromLmdb.item || !lmdbChanUpdate.updates) {
        return cbk();
      }

      const changes = {};
      const expect = {updated_at: getChanFromLmdb.item.updated_at};

      Object.keys(lmdbChanUpdate.updates)
        .filter(attr => lmdbChanUpdate.updates[attr] !== undefined)
        .forEach(attr => changes[attr] = {set: lmdbChanUpdate.updates[attr]});

      try {
        updateLmdbItem({changes, expect, key, lmdb, db: chansDb});

        const value = {};

        // Create links from the pubkeys to the channel id
        nodeNumbers
          .map(n => lmdbChanUpdate.updates[`node${n}_public_key`])
          .filter(n => !!n)
          .map(pubKey => ({lmdb, db: nodeChannelsDb, key: `${pubKey}${key}`}))
          .forEach(({db, key, lmdb}) => putLmdbItem({db, key, lmdb, value}));

        return cbk();
      } catch (err) {
        return cbk([500, 'FailedToUpdateChannelItemInLmdb', err]);
      }
    }],

    // Update dynamodb's node metadata on the channel
    updateDdbChannelNodeMetadata: [
      'db',
      'ddbChanUpdate',
      'getChanFromDdb',
      'key',
      ({db, ddbChanUpdate, getChanFromDdb, key}, cbk) =>
    {
      // Exit early when not updating dynamodb or nothing has been updated
      if (!db || !ddbChanUpdate || !ddbChanUpdate.updates || !getChanFromDdb) {
        return cbk();
      }

      const existing = getChanFromDdb.item || {};
      const table = `${args.aws_dynamodb_table_prefix}-${nodesDb}`;
      const {updated} = ddbChanUpdate;

      const node1Pk = existing.node1_public_key || args.node1_public_key;
      const node2Pk = existing.node2_public_key || args.node2_public_key;

      // Look for updates to the peers' metadata, update chan row as necessary
      return asyncMap([node1Pk, node2Pk].filter(n => !!n), (key, cbk) => {
        return getDdbItem({db, table, where: {key}}, cbk);
      },
      (err, got) => {
        if (!!err) {
          return cbk(err);
        }

        let node1Updated;
        let node2Updated;
        const nodes = got.map(({item}) => item).filter(item => !!item);
        const updates = {};

        const node1 = nodes.find(n => !!node1Pk && n.key === node1Pk);
        const node2 = nodes.find(n => !!node2Pk && n.key === node2Pk);

        if (!!node1 && existing.node1_alias !== node1.alias) {
          node1Updated = true;
          updates.node1_alias = node1.alias;
        }

        if (!!node1 && existing.node1_color !== node1.color) {
          node1Updated = true;
          updates.node1_color = node1.color;
        }

        if (!!node2 && existing.node2_alias !== node2.alias) {
          node2Updated = true;
          updates.node2_alias = node2.alias;
        }

        if (!!node2 && existing.node2_color !== node2.color) {
          node2Updated = true;
          updates.node2_color = node2.color;
        }

        const metadata = [node1Updated, node2Updated].map((updated, index) => {
          return {index, updated};
        });

        return asyncEach(metadata, ({index, updated}, cbk) => {
          if (!updated) {
            return cbk();
          }

          const n = index + [updated].length;
          const node = ([node1, node2])[index];

          if (!node || !node.key) {
            return cbk(500, 'ExpectedNodeAtIndexWhenUpdatingMetadata');
          }

          return updateChannelMetadata({
            index,
            alias: updates[`node${n}_alias`] || undefined,
            aws_access_key_id: args.aws_access_key_id,
            aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
            aws_secret_access_key: args.aws_secret_access_key,
            color: updates[`node${n}_color`] || undefined,
            id: args.id,
            network: args.network,
            public_key: node.key,
          },
          cbk);
        },
        cbk);
      });
    }],

    // Updated channel
    updatedChannel: [
      'ddbChanUpdate',
      'updatedAt',
      ({ddbChanUpdate, updatedAt}, cbk) =>
    {
      // Exit early when there were no updates
      if (!ddbChanUpdate || !ddbChanUpdate.updates) {
        return cbk(null, {});
      }

      const {updates} = ddbChanUpdate;

      return cbk(null, {
        node1_base_fee_mtokens: updates.node1_base_fee_mtokens,
        node1_cltv_delta: updates.node1_cltv_delta,
        node1_fee_rate: updates.node1_fee_rate,
        node1_is_disabled: updates.node1_is_disabled,
        node1_min_htlc_tokens: updates.node1_min_htlc_tokens,
        node1_updated_at: updates.node1_updated_at,
        node1_public_key: updates.node1_public_key,
        node2_base_fee_mtokens: updates.node2_base_fee_mtokens,
        node2_cltv_delta: updates.node2_cltv_delta,
        node2_fee_rate: updates.node2_fee_rate,
        node2_is_disabled: updates.node2_is_disabled,
        node2_min_htlc_tokens: updates.node2_min_htlc_tokens,
        node2_public_key: updates.node2_public_key,
        node2_updated_at: updates.node2_updated_at,
        updated_at: updatedAt,
      });
    }],
  },
  returnResult({of: 'updatedChannel'}, cbk));
};

