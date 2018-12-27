const objAsDdbRow = require('./obj_as_ddb_row');

/** Commit a write to DynamoDb

  {
    db: <Dynamodb Object>
    [fresh]: [<Expect Fresh Attribute String>]
    item: <Item to Write Object>
    table: <Table String>
  }
*/
module.exports = ({db, fresh, item, table}, cbk) => {
  if (!db || !db.putItem) {
    return cbk([400, 'ExpectedDynamodDbObjectToExecutePutItem']);
  }

  if (!!fresh && !Array.isArray(fresh)) {
    return cbk([400, 'ExpectedFreshAttributeArrayForPutItem']);
  }

  if (!item) {
    return cbk([400, 'ExpectedItemToPut']);
  }

  if (!table) {
    return cbk([400, 'ExpectedTableForPutItem']);
  }

  const names = {};

  (fresh || []).forEach(attr => names[`#${attr}`] = attr);

  const expect = (fresh || []).map(attr => `attribute_not_exists(#${attr})`);

  return db.putItem({
    ConditionExpression: !expect.length ? undefined : expect.join(' and '),
    ExpressionAttributeNames: !expect.length ? undefined : names,
    Item: objAsDdbRow(item),
    TableName: table,
  },
  err => {
    if (!!err && !err.code) {
      return cbk([503, 'UnexpectedPutItemError', err]);
    }

    if (!!err) {
      switch (err.code) {
      case 'ConditionalCheckFailedException':
        return cbk([409, 'UnexpectedConflictWhenPuttingItem']);

      case 'ProvisionedThroughputExceededException':
        return cbk([503, 'ExceededProvisioningWhenPuttingItem', table]);

      default:
        return cbk([503, 'UnexpectedErrorWhenPuttingItem', err.code, item]);
      }
    }

    return cbk();
  });
};

