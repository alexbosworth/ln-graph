const ddbRowFormattedValue = require('./ddb_row_formatted_value');
const objAsDdbRow = require('./obj_as_ddb_row');
const objFromDdbRow = require('./obj_from_ddb_row');

/** Update a Dynamodb record

  {
    changes: <Changes Object>
    db: <DynamoDb Object>
    [expect]: <Expect Object>
    table: <Table Name String>
    where: <Item Key Object>
  }

  @returns via cbk
  {
    item: <Item Object>
  }
*/
module.exports = ({changes, db, expect, table, where}, cbk) => {
  if (!changes) {
    return cbk([400, 'ExpectedChangesForUpdateItem']);
  }

  if (!db || !db.updateItem) {
    return cbk([400, 'ExpectedDynamoDbObjectForUpdatingItem']);
  }

  if (!table) {
    return cbk([400, 'ExpectedTableToExecuteUpdateItemAgainst']);
  }

  if (!where) {
    return cbk([400, 'ExpectedWhereClauseForUpdateItem']);
  }

  let key;

  try {
    key = objAsDdbRow(where);
  } catch (err) {
    return cbk([400, 'ExpectedValidWhereValue', err]);
  }

  const expected = [];
  const names = {};
  const operations = [];
  const vals = {};

  Object.keys(changes).forEach(attr => {
    names[`#${attr}`] = attr;

    if (!!changes[attr].add) {
      vals[`:${attr}`] = ddbRowFormattedValue(changes[attr].add);
      operations.push(`#${attr} = #${attr} + :${attr}`);
    } else if (changes[attr].set !== undefined) {
      vals[`:${attr}`] = ddbRowFormattedValue(changes[attr].set);
      operations.push(`#${attr} = :${attr}`);
    }

    return;
  });

  Object.keys(expect || {}).forEach(attr => {
    names[`#${attr}`] = attr;
    vals[`:equals_${attr}`] = ddbRowFormattedValue(expect[attr]);

    return expected.push(`#${attr} = :equals_${attr}`);
  });

  return db.updateItem({
    ConditionExpression: expected.join(' and '),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: vals,
    Key: key,
    ReturnValues: 'ALL_NEW',
    TableName: table,
    UpdateExpression: `SET ${operations.join(',')}`,
  },
  (err, res) => {
    if (!!err && !err.code) {
      return cbk([503, 'UnidentifiedDynamoDbErrorWhenUpdatingItem', err]);
    }

    if (!!err && err.code === 'ProvisionedThroughputExceededException') {
      return cbk([503, 'UpdateItemCouldNotBeCompletedDbBusy', table]);
    }

    if (!!err && err.code === 'ConditionalCheckFailedException') {
      return cbk([409, 'UpdateItemConditionalCheckFailed']);
    }

    if (!!err) {
      return cbk([503, 'UnexpectedDynamoDbUpdateItemError', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResultFromUpdateItemOnDynamoDb']);
    }

    if (!res.Attributes) {
      return cbk([503, 'ExpectedAttributesInUpdateItemResult']);
    }

    let item;

    try {
      return cbk(null, {item: objFromDdbRow(res.Attributes)});
    } catch (err) {
      return cbk([503, 'FailedToDemarshallDynamoDbObject', err]);
    }
  });
};

