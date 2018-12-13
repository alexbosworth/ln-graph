const objAsDdbRow = require('./obj_as_ddb_row');
const objFromDdbRow = require('./obj_from_ddb_row');

/** Get an item from DynamoDb

  {
    [attributes]: [<Attribute Name String>]
    db: <DynamoDB Object>
    [is_consistent]: <Is Consistent Bool>
    table: <Table Name String>
    where: <Item Key Object>
  }

  @returns via cbk
  {
    [item]: <Item Object>
  }
*/
module.exports = (args, cbk) => {
  if (!!args.attributes && !Array.isArray(args.attributes)) {
    return cbk([400, 'ExpectedAttributesAsArrayForAttributesToGet']);
  }

  if (!args.db || !args.db.getItem) {
    return cbk([400, 'ExpectedDynamoDbObjectToGetItem']);
  }

  if (!args.table) {
    return cbk([400, 'ExpectedTableForItemToGet']);
  }

  if (!args.where) {
    return cbk([400, 'ExpectedWhereClauseToGetItem']);
  }

  let key;

  try {
    key = objAsDdbRow(args.where);
  } catch (err) {
    return cbk([400, 'ExpectedValidWhereValueForGetItem', err]);
  }

  const params = {
    ConsistentRead: !!args.is_consistent,
    Key: key,
    ProjectionExpression: !args.attributes ? null : args.attributes.join(','),
    TableName: args.table,
  };

  return args.db.getItem(params, (err, res) => {
    if (!!err && err.code === 'ProvisionedThroughputExceededException') {
      return cbk([503, 'InsufficientTableReadProvisioning', args.table]);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedErrorWhenGettingItem', err]);
    }

    if (!Object.keys(res).length) {
      return cbk(null, {});
    }

    if (!res.Item) {
      return cbk([503, 'ExpectedResultItemFromDynamoDb', res]);
    }

    try {
      return cbk(null, {item: objFromDdbRow(res.Item)});
    } catch (err) {
      return cbk([503, 'UnexpectedRowFormatForGetItemRequest', err]);
    }
  });
};

