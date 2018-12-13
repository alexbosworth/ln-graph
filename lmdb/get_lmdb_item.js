const {parse} = JSON;

/** Get an item from lmdb

  {
    db: <Db Name String>
    key: <Key String>
    lmdb: <Lmdb Object>
  }

  @throws
  <Error>

  @returns
  {
    [item]: <Item Object>
  }
*/
module.exports = ({db, key, lmdb}) => {
  if (!db) {
    throw new Error('ExpectedDbToGetLmdbItemIn');
  }

  if (!key) {
    throw new Error('ExpectedKeyForLmdbItemLookup');
  }

  if (!lmdb) {
    throw new Error('ExpectedLmdbForGetItem');
  }

  let database;

  try {
    database = lmdb.registerDb({db});
  } catch (err) {
    throw err;
  }

  const tx = lmdb.env.beginTxn();

  const data = tx.getString(database, key);

  tx.commit();

  if (!data) {
    return {};
  }

  try {
    return {item: parse(data)};
  } catch (err) {
    return {};
  }
};

