const ddbRowFormattedValue = require('./ddb_row_formatted_value');

/** Convert an entire object to DynamoDb schema

  @param
  <Regular Object>

  @throws
  <Error>

  @returns
  <Dynamodb Row Object>
*/
module.exports = obj => {
  const row = {};

  try {
    Object.keys(obj)
      .filter(k => obj[k] !== undefined && obj[k] !== '')
      .forEach(k => row[k] = ddbRowFormattedValue(obj[k]));
  } catch (err) {
    throw new Error('FailedToConvertObjectToDdbRow');
  }

  return row;
};

