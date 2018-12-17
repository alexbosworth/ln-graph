const {chainId} = require('./../chains');
const {chansDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {getDdbItem} = require('./../dynamodb');

/** Get a channel row from dynamodb

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    id: <Raw Channel Id Hex String>
    network: <Network Name String>
  }

  @returns via cbk
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
      updated_at: <Channel Last Updated At ISO 8601 Date String>
    }
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyToGetChannelRow']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixToGetChannelRow']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyToGetChannelRow']);
  }

  if (!args.id) {
    return cbk([400, 'ExpectedChannelIdToGetChannelRow']);
  }

  if (!args.network) {
    return cbk([400, 'ExpectedChannelNetworkToGetChannelRow']);
  }

  let chain;
  let db;
  const {id} = args;
  const table = `${args.aws_dynamodb_table_prefix}-${chansDb}`;

  try {
    chain = chainId({network: args.network}).chain_id;
  } catch (err) {
    return cbk([500, 'ExpectedKnownNetworkToGetChannelRow']);
  }

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedToGetDdbConnectionForChannelRowFetch', err]);
  }

  return getDdbItem({db, table, where: {key: `${chain}${id}`}}, (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const {item} = res;

    if (!item) {
      return cbk(null, {});
    }

    return cbk(null, {
      channel: {
        capacity: item.capacity,
        close_height: item.close_height,
        policies: [
          {
            base_fee_mtokens: item.node1_base_fee_mtokens,
            cltv_delta: item.node1_cltv_delta,
            fee_rate: item.node1_fee_rate,
            is_disabled: item.node1_is_disabled,
            min_htlc_mtokens: item.node1_min_htlc_mtokens,
            public_key: item.node1_public_key,
          },
          {
            base_fee_mtokens: item.node2_base_fee_mtokens,
            cltv_delta: item.node2_cltv_delta,
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
    });
  });
};

