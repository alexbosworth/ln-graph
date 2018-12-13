const {Cursor} = require('node-lmdb');

const {parse} = JSON;

/** Query lmdb

  {
    db: <Database Name String>
    [limit]: <Results Limit Number>
    lmdb: <LMDB Object>
    [where]: {
      before: <Before Key String>
      starts_with: <Key Starts With String>
    }
  }

  @throws
  <Error>

  @returns
  {
    items: [{data: <Item Object>, key: <Key String>}]
  }
*/
module.exports = ({db, limit, lmdb, where}) => {
  if (!db) {
    throw new Error('ExpectedDbToQueryLmdb');
  }

  if (!lmdb) {
    throw new Error('ExpectedLmdbForQueryOperation');
  }

  let database;

  try {
    database = lmdb.registerDb({db});
  } catch (err) {
    throw err;
  }

  const items = [];
  const tx = lmdb.env.beginTxn();

  const cursor = new Cursor(tx, database);

  const before = !!where && !!where.before ? where.before : null;
  const q = !!where && where.starts_with ? where.starts_with : null;

  for (
    let n = !q ? cursor.goToFirst() : cursor.goToRange(q);
    (n !== null && items.length < (limit || Infinity));
    n = cursor.goToNext()
  ) {
    cursor.getCurrentString((key, data) => {
      // Break loop when query constraints are no longer met
      if (!!q && !key.startsWith(q)) {
        return cursor.goToLast();
      }

      // Break loop when the key breaks the before constraint
      if (!!before && key > before) {
        return cursor.goToLast();
      }

      return items.push({key, data: parse(data)});
    });
  }

  cursor.close();

  tx.commit();

  return {items};
};

