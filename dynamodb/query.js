const ddbRowFormattedValue = require('./ddb_row_formatted_value');
const objAsDdbRow = require('./obj_as_ddb_row');
const objFromDdbRow = require('./obj_from_ddb_row');

/** Query for items

  {
    db: <DynamoDb Object>
    [is_descending]: <Query Results Are Descending Bool>
    [limit]: <Limit Results Number>
    table: <Table Name String>
    where: <Where Object>
  }

  @returns via cbk
  {
    items: [<Result Item Object>]
    [last_key]: <Last Key Object>
  }
*/
module.exports = (args, cbk) => {
  if (!args.db || !args.db.query) {
    return cbk([400, 'ExpectedDynamoDbConnectionForItemsQuery']);
  }

  if (!args.table) {
    return cbk([400, 'ExpectedTableForItemsQuery']);
  }

  if (!args.where) {
    return cbk([400, 'ExpectedWhereForItemsQuery']);
  }

  const attributeNames = {};
  const attributeValues = {};
  const matches = [];

  try {
    Object.keys(args.where).forEach(attr => {
      attributeNames[`#${attr}`] = attr;

      Object.keys(args.where[attr]).forEach(comparison => {
        attributeValues[`:${attr}`] = ddbRowFormattedValue(args.where[attr][comparison]);

        switch (comparison) {
        case 'eq':
          matches.push(`#${attr} = :${attr}`);
          break;

        case 'gt':
          matches.push(`#${attr} > :${attr}`);
          break;

        default:
          throw new Error('UnexpectedComparisonInQuery');
        }
      });
    });
  } catch (err) {
    return cbk([400, 'ExpectedValidWhereClauseForQuery', err]);
  }

  const params = {
    ExpressionAttributeNames: attributeNames,
    ExpressionAttributeValues: attributeValues,
    KeyConditionExpression: matches.join(' and '),
    Limit: args.limit || undefined,
    ScanIndexForward: !args.is_descending,
    TableName: args.table,
  };

  return args.db.query(params, (err, res) => {
    if (!!err) {
      return cbk([503, 'UnexpectedErrorForDbQuery', err]);
    }

    if (!res) {
      return cbk([503, 'ExpectedResultsForDbQuery']);
    }

    if (res.Count === undefined) {
      return cbk([503, 'ExpectedResultsCountForDbQuery']);
    }

    if (!Array.isArray(res.Items)) {
      return cbk([503, 'ExpectedResultsArrayForDbQuery']);
    }

    let lastKey;

    try {
      const items = res.Items.map(n => objFromDdbRow(n));

      if (!!res.LastEvaluatedKey) {
        lastKey = objFromDdbRow(res.LastEvaluatedKey);
      }

      return cbk(null, {items, last_key: lastKey || undefined});
    } catch (err) {
      return cbk([503, 'FailedToDemarshalDbQueryResultItems']);
    }
  });
};

