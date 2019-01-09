const {chanFormat} = require('bolt07');

const {chainIdByteCount} = require('./constants');

/** Channel formatted object from a channel row item

  {
    capacity: <Capacity Tokens Number>
    [close_height]: <Close Height Number>
    key: <Channel Key String>
    [node1_alias]: <Alias String>
    [node1_attempted]: <Attempted Type String>
    [node1_attempted_at]: <Attempted At ISO 8601 Date String>
    [node1_attempted_tokens]: <Attempted Tokens Number>
    node1_base_fee_mtokens: <Base Fee Millitokens String>
    node1_cltv_delta: <CLTV Delta Number>
    [node1_color]: <Color String>
    node1_fee_rate: <Fee Rate Number>
    node1_is_disabled: <Forwarding Disabled Bool>
    node1_min_htlc_mtokens: <Min HTLC Millitokens String>
    node1_public_key: <Public Key Hex String>
    [node2_alias]: <Alias String>
    [node2_attempted]: <Attempted Type String>
    [node2_attempted_at]: <Attempted At ISO 8601 Date String>
    [node2_attempted_tokens]: <Attempted Tokens Number>
    node2_base_fee_mtokens: <Base Fee Millitokens String>
    node2_cltv_delta: <CLTV Delta Number>
    [node2_color]: <Color String>
    node2_fee_rate: <Fee Rate Number>
    node2_is_disabled: <Forwarding Disabled Bool>
    node2_min_htlc_mtokens: <Min Forward Millitokens String>
    node2_public_key: <Public Key Hex String>
    transaction_id: <Outpoint Transaction Id Hex String>
    transaction_vout: <Outpoint Transaction Output Index Number>
    updated_at: <Channel Updated At ISO 8601 Date String>
  }

  @throws
  <Error>

  @returns
  {
    channel: [{
      capacity: <Capacity Tokens Number>
      [close_height]: <Close Height Number>
      id: <Standard Format Channel Id String>
      policies: [{
        [alias]: <Alias String>
        [attempted]: <Attempt Result String>
        [attempted_at]: <Attempt ISO 8601 Date String>
        [attempted_tokens]: <Attempted Sending With Tokens Number>
        [base_fee_mtokens]: <Base Fee Millitokens String>
        [cltv_delta]: <CLTV Delta Number>
        [color]: <Color String>
        [fee_rate]: <Fee Rate Number>
        [is_disabled]: <Is Disabled Bool>
        [min_htlc_mtokens]: <Minimum HTLC Millitokens String>
        [public_key]: <Public Key Hex String>
      }]
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
      updated_at: <Channel Update at ISO 8601 Date String>
    }]
  }
*/
module.exports = item => {
  let id;

  try {
    id = chanFormat({id: item.key.slice(chainIdByteCount)}).channel;
  } catch (err) {
    throw new Error('ExpectedRawChannelIdForChannelRow');
  }

  return {
    channel: {
      id,
      capacity: item.capacity,
      close_height: item.close_height,
      policies: [
        {
          alias: item.node1_alias,
          attempted: item.node1_attempted,
          attempted_at: item.node1_attempted_at,
          attempted_tokens: item.node1_attempted_tokens,
          base_fee_mtokens: item.node1_base_fee_mtokens,
          cltv_delta: item.node1_cltv_delta,
          color: item.node1_color,
          fee_rate: item.node1_fee_rate,
          is_disabled: item.node1_is_disabled,
          min_htlc_mtokens: item.node1_min_htlc_mtokens,
          public_key: item.node1_public_key,
        },
        {
          alias: item.node2_alias,
          attempted: item.node2_attempted,
          attempted_at: item.node2_attempted_at,
          attempted_tokens: item.node2_attempted_tokens,
          base_fee_mtokens: item.node2_base_fee_mtokens,
          cltv_delta: item.node2_cltv_delta,
          color: item.node2_color,
          fee_rate: item.node2_fee_rate,
          is_disabled: item.node2_is_disabled,
          min_htlc_mtokens: item.node2_min_htlc_mtokens,
          public_key: item.node2_public_key,
        },
      ],
      transaction_id: item.transaction_id,
      transaction_vout: item.transaction_vout,
      updated_at: item.updated_at,
    },
  };
};

