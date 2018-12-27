const {nodesDb} = require('./constants');
const {ddb} = require('./../dynamodb');
const {getDdbItem} = require('./../dynamodb');

/** Get a node row from dynamodb

  {
    aws_access_key_id: <AWS Access Key Id String>
    aws_dynamodb_table_prefix: <AWS DynamoDb Table Name Prefix String>
    aws_secret_access_key: <AWS Secret Access Key String>
    public_key: <Public Key Hex String>
  }

  @returns via cbk
  {
    [node] {
      [alias]: <Node Alias String>
      [color]: <Node Color String>
      [sockets]: [<Socket String>]
      updated_at: <Node Updated At ISO 8601 Date String>
    }
  }
*/
module.exports = (args, cbk) => {
  if (!args.aws_access_key_id) {
    return cbk([400, 'ExpectedAwsAccessKeyToGetNodeRow']);
  }

  if (!args.aws_dynamodb_table_prefix) {
    return cbk([400, 'ExpectedAwsTablePrefixToGetNodeRow']);
  }

  if (!args.aws_secret_access_key) {
    return cbk([400, 'ExpectedAwsSecretAccessKeyToGetNodeRow']);
  }

  if (!args.public_key) {
    return cbk([400, 'ExpectedChannelIdToGetNodeRow']);
  }

  let db;
  const table = `${args.aws_dynamodb_table_prefix}-${nodesDb}`;

  try {
    db = ddb({
      access_key_id: args.aws_access_key_id,
      secret_access_key: args.aws_secret_access_key,
    });
  } catch (err) {
    return cbk([500, 'FailedToGetDdbConnectionForNodeRowFetch', err]);
  }

  return getDdbItem({db, table, where: {key: args.public_key}}, (err, res) => {
    if (!!err) {
      return cbk(err);
    }

    const {item} = res;

    if (!item) {
      return cbk(null, {});
    }

    return cbk(null, {
      node: {
        alias: item.alias,
        color: item.color,
        sockets: item.sockets,
        updated_at: item.updated_at,
      },
    });
  });
};

