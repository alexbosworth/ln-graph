const asyncRetry = require('async/retry');

const registerChannelUpdate = require('./register_channel_update');

const retryInterval = retryCount => 50 * Math.pow(2, retryCount);
const retryTimes = 15;

/** Update a channel record

  {
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_access_key_id: <AWS Access Key Id String>
    aws_secret_access_key: <AWS Secret Access Key String>
    [base_fee_mtokens]: <Channel Base Fee Millitokens String>
    capacity: <Channel Capacity Tokens Number>
    channel_id: <Channel Id String>
    [close_height]: <Close Height Number>
    [cltv_delta]: <Channel CLTV Delta Number>
    [fee_rate]: <Channel Feel Rate In Millitokens Per Million Number>
    [is_disabled]: <Channel Is Disabled Bool>
    [min_htlc_mtokens]: <Channel Minimum HTLC Millitokens String>
    network: <Network Name String>
    [public_keys]: [<Announcing Public Key>, <Target Public Key String>]
    transaction_id: <Channel Transaction Id String>
    transaction_vout: <Channel Transaction Output Index Number>
    type: <Row Type String>
    updated_at: <Update Received At ISO 8601 Date String>
  }
*/
module.exports = (args, cbk) => {
  const update = {};

  if (!!args.public_keys) {
    const policy = {};
    const [source, target] = args.public_keys;

    policy.base_fee_mtokens = args.base_fee_mtokens;
    policy.cltv_delta = args.cltv_delta;
    policy.fee_rate = args.fee_rate;
    policy.is_disabled = args.is_disabled;
    policy.min_htlc_mtokens = args.min_htlc_mtokens;
    policy.public_key = source;
    policy.updated_at = args.updated_at;

    const nodeNumber = source < target ? 1 : 2;

    Object.keys(policy).forEach(attr => {
      return update[`node${nodeNumber}_${attr}`] = policy[attr];
    });
  }

  update.capacity = args.capacity;
  update.channel_id = args.channel_id;
  update.close_height = args.close_height;
  update.network = args.network;
  update.transaction_id = args.transaction_id;
  update.transaction_vout = args.transaction_vout;

  return asyncRetry(
    {
      interval: retryInterval,
      times: retryTimes,
    },
    cbk => {
      return registerChannelUpdate({
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_access_key_id: args.aws_access_key_id,
        aws_secret_access_key: args.aws_secret_access_key,
        capacity: update.capacity,
        channel_id: update.channel_id,
        close_height: update.close_height,
        network: update.network,
        node1_base_fee_mtokens: update.node1_base_fee_mtokens,
        node1_cltv_delta: update.node1_cltv_delta,
        node1_fee_rate: update.node1_fee_rate,
        node1_is_disabled: update.node1_is_disabled,
        node1_min_htlc_mtokens: update.node1_min_htlc_mtokens,
        node1_public_key: update.node1_public_key,
        node1_updated_at: update.node1_updated_at,
        node2_base_fee_mtokens: update.node2_base_fee_mtokens,
        node2_cltv_delta: update.node2_cltv_delta,
        node2_fee_rate: update.node2_fee_rate,
        node2_is_disabled: update.node2_is_disabled,
        node2_min_htlc_mtokens: update.node2_min_htlc_mtokens,
        node2_public_key: update.node2_public_key,
        node2_updated_at: update.node2_updated_at,
        transaction_id: update.transaction_id,
        transaction_vout: update.transaction_vout,
      },
      cbk);
    },
    cbk
  );
};

