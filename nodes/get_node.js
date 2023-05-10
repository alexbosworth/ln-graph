const asyncAuto = require('async/auto');
const {getNode} = require('ln-service');
const {returnResult} = require('asyncjs-util');

const {getNodeRow} = require('./../rows');

/** Get a node, using different strategies

  {
    [aws_access_key_id]: <AWS Access Key Id String>
    [aws_dynamodb_table_prefix]: <AWS DynamoDb Table Name Prefix String>
    [aws_secret_access_key]: <AWS Secret Access Key String>
    [lnd]: <LND Object>
    public_key: <Public Key Hex String>
  }

  @returns
  {
    [node] {
      alias: <Alias String>
      color: <Color String>
      [sockets]: [<Socket String>]
      [updated_at]: <ISO 8601 Date String>
    }
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.aws_access_key_id && !args.lnd) {
        return cbk([400, 'ExpectedAwsOrLndForNodeLookup']);
      }

      if (!args.public_key) {
        return cbk([400, 'ExpectedPublicKeyToGetNode']);
      }

      return cbk();
    },

    // Get node from ddb
    ddbGet: ['validate', ({}, cbk) => {
      return getNodeRow({
        aws_access_key_id: args.aws_access_key_id,
        aws_dynamodb_table_prefix: args.aws_dynamodb_table_prefix,
        aws_secret_access_key: args.aws_secret_access_key,
        public_key: args.public_key,
      },
      cbk);
    }],

    // Get node from lnd
    lndGet: ['ddbGet', ({ddbGet}, cbk) => {
      if (!args.lnd) {
        return cbk();
      }

      if (!!ddbGet && !!ddbGet.node) {
        return cbk();
      }

      return getNode({
        is_omitting_channels: true,
        lnd: args.lnd,
        public_key: args.public_key,
      },
      cbk);
    }],

    // Node
    node: ['ddbGet', 'lndGet', ({ddbGet, lndGet}, cbk) => {
      if (!!ddbGet && !!ddbGet.node) {
        return cbk(null, ddbGet);
      }

      if (!!lndGet) {
        return cbk(null, {node: lndGet});
      }

      return cbk([404, 'FailedToGetNodeForPublicKey']);
    }],
  },
  returnResult({of: 'node'}, cbk));
};

