const asyncAuto = require('async/auto');
const {rawChanId} = require('bolt07');
const {returnResult} = require('asyncjs-util');

const {chainId} = require('./../chains');
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {updateDdbItem}= require('./../dynamodb');

/** Update channel details

  {
    aws: {
      [aws_access_key_id]: <AWS Access Key Id String>
      [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
      [aws_secret_access_key]: <AWS Secret Access Key String>
    }
    channel: {
      capacity: <Tokens Number>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>e
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value Number>
        [public_key]: <Node Public Key String>
      }]
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Vout Number>
      updated_at: <Channel Last Update ISO 8601 Date String>
    }
    existing: {
      capacity: <Tokens Number>
      policies: [{
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <Locktime Delta Number>e
        [fee_rate]: <Fees Charged Per Million Tokens Number>
        [is_disabled]: <Channel Is Disabled Bool>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens Value Number>
        [public_key]: <Node Public Key String>
      }]
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Vout Number>
      updated_at: <Channel Last Update ISO 8601 Date String>
    }
    id: <Standard Channel Id String>
    network: <Network Name String>
  }
*/
module.exports = ({aws, channel, existing, id, network}, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!aws || !aws.aws_access_key_id) {
        return cbk([400, 'ExpectedAwsAccessKeyIdToUpdateChannelDetails']);
      }

      if (!channel) {
        return cbk([400, 'ExpectedUpdatedChannelToUpdateChannelDetails']);
      }

      if (!existing) {
        return cbk([400, 'ExpectedExistingChannelDetailsForChannelRowUpdate']);
      }

      if (!network) {
        return cbk([400, 'ExpectedNetworkForChannelRowUpdate']);
      }

      if (!id) {
        return cbk([400, 'ExpectedChannelIdForChannelRowUpdate']);
      }

      return cbk();
    },

    // Chain id for network
    chain: ['validate', ({}, cbk) => {
      try {
        return cbk(null, chainId({network}).chain_id);
      } catch (err) {
        return cbk([400, 'ExpectedValidNetworkToUpdateChannelDetails', err]);
      }
    }],

    // Get the dynamodb database context
    db: ['validate', ({}, cbk) => {
      try {
        return cbk(null, ddb({
          access_key_id: aws.aws_access_key_id,
          secret_access_key: aws.aws_secret_access_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToGetDdbConnectionToUpdateChannel', err]);
      }
    }],

    // The database id for a channel is its raw hex form
    id: ['validate', ({}, cbk) => {
      try {
        return cbk(null, rawChanId({channel: id}).id);
      } catch (err) {
        return cbk([400, 'ExpectedValidStandardChannelIdToUpdateChan', err]);
      }
    }],

    // Channel key
    key: ['chain', 'id', ({chain, id}, cbk) => cbk(null, `${chain}${id}`)],

    // Update the ddb row
    update: ['db', 'key', ({db, key}, cbk) => {
      const changes = {};

      if (existing.capacity !== channel.capacity) {
        changes.capacity = {set: channel.capacity};
      }

      const [existingPolicy1, existingPolicy2] = existing.policies;
      const [policy1, policy2] = channel.policies;

      if (existingPolicy1.base_fee_mtokens !== policy1.base_fee_mtokens) {
        changes.node1_base_fee_mtokens = {set: policy1.base_fee_mtokens};
      }

      if (existingPolicy1.cltv_delta !== policy1.cltv_delta) {
        changes.node1_cltv_delta = {set: policy1.cltv_delta};
      }

      if (existingPolicy1.fee_rate !== policy1.fee_rate) {
        changes.node1_fee_rate = {set: policy1.fee_rate};
      }

      if (existingPolicy1.is_disabled !== policy1.is_disabled) {
        changes.node1_is_disabled = {set: policy1.is_disabled};
      }

      if (existingPolicy1.min_htlc_tokens !== policy1.min_htlc_tokens) {
        changes.node1_min_htlc_tokens = {set: policy1.min_htlc_tokens};
      }

      if (!existingPolicy1.public_key) {
        changes.node1_public_key = {set: policy1.public_key};
      }

      if (!existingPolicy1.updated_at) {
        changes.node1_updated_at = {set: channel.updated_at};
      }

      if (existingPolicy2.base_fee_mtokens !== policy2.base_fee_mtokens) {
        changes.node2_base_fee_mtokens = {set: policy2.base_fee_mtokens};
      }

      if (existingPolicy2.cltv_delta !== policy2.cltv_delta) {
        changes.node2_cltv_delta = {set: policy2.cltv_delta};
      }

      if (existingPolicy2.fee_rate !== policy2.fee_rate) {
        changes.node2_fee_rate = {set: policy2.fee_rate};
      }

      if (existingPolicy2.is_disabled !== policy2.is_disabled) {
        changes.node2_is_disabled = {set: policy2.is_disabled};
      }

      if (existingPolicy2.min_htlc_tokens !== policy2.min_htlc_tokens) {
        changes.node2_min_htlc_tokens = {set: policy2.min_htlc_tokens};
      }

      if (!existingPolicy2.public_key) {
        changes.node2_public_key = {set: policy2.public_key};
      }

      if (!existingPolicy2.updated_at) {
        changes.node2_updated_at = {set: channel.updated_at};
      }

      if (!existing.transaction_id) {
        changes.transaction_id = {set: channel.transaction_id};
      }

      if (existing.transaction_vout === undefined) {
        changes.transaction_vout = {set: channel.transaction_vout};
      }

      const table = `${aws.aws_dynamodb_table_prefix}-${chansDb}`;

      return updateDdbItem({changes, db, table, where: {key}}, cbk);
    }],
  },
  returnResult({}, cbk));
};
