const {Cursor} = require('node-lmdb');

const isMatchingWhere = require('./is_matching_where');

const {parse} = JSON;

/** Query lmdb

  {
    db: <Database Name String>
    [keys]: {
      [before]: <Before Key String>
      [starts_with]: <Key Starts With String>
    }
    [limit]: <Results Limit Number>
    lmdb: <LMDB Object>
    [where]: {
      $attribute_name: {
        [eq]: <Equals String>
        [gt]: <Greater Than String>
        [starts_with]: <Starts With String>
      }
    }
  }

  @throws
  <Error>

  @returns
  {
    items: [{data: <Item Object>, key: <Key String>}]
  }
*/
module.exports = ({db, keys, limit, lmdb, where}) => {
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

  const before = !!keys && !!keys.before ? keys.before : null;
  const q = !!keys && keys.starts_with ? keys.starts_with : null;

  for (
    let n = !q ? cursor.goToFirst() : cursor.goToRange(q);
    (n !== null && items.length < (limit || Infinity));
    n = cursor.goToNext()
  ) {
    cursor.getCurrentString((key, row) => {
      // Break loop when query constraints are no longer met
      if (!!q && !key.startsWith(q)) {
        return cursor.goToLast();
      }

      // Break loop when the key breaks the before constraint
      if (!!before && key > before) {
        return cursor.goToLast();
      }

      const data = parse(row);

      if (!!where && !isMatchingWhere({data, where})) {
        return;
      }

      return items.push({data, key});
    });
  }

  cursor.close();

  tx.commit();

  return {items};
};
