const decBase = 10;

/** Convert a DynamoDB compatible Object into a native object

  @param
  <Ddb Object>

  @throws
  Error if input object not compatible

  @returns
  <Unmarshalled Object>
*/
module.exports = row => {
  const res = {};

  Object.keys(row).forEach(attr => {
    const str = row[attr].S || row[attr].SS || null;

    if (!!row[attr].B) {
      res[attr] = Buffer.from(row[attr].B, 'base64');
    } else if (row[attr].BOOL !== undefined) {
      res[attr] = row[attr].BOOL;
    } else if (!!row[attr].BS) {
      res[attr] = row[attr].BS.map(n => Buffer.from(n, 'base64'));
    } else if (!!row[attr].M) {
      res[attr] = module.exports(row[attr].M);
    } else if (!!row[attr].S) {
      res[attr] = row[attr].S;
    } else if (!!row[attr].SS) {
      res[attr] = row[attr].SS;
    } else if (!!row[attr].N) {
      res[attr] = parseFloat(row[attr].N, decBase);
    } else if (!!row[attr].NS) {
      res[attr] = row[attr].NS.map(n => parseFloat(n, decBase));
    } else if (!!row[attr].NULL) {
      res[attr] = null;
    } else {
      throw new Error('UnexpectedRowField');
    }

    return;
  });

  return res;
};

