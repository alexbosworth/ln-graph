const {parse} = JSON;
const {stringify} = JSON;

/** Put item in lmdb

  {
    db: <Db Name String>
    fresh: [<Expected Fresh Attribute String>]
    key: <Key String>
    lmdb: <Lmdb Object>
    value: <Value Object>
  }

  @throws
  <Error>
*/
module.exports = ({db, fresh, key, lmdb, value}) => {
  if (!db) {
    throw new Error('ExpectedDbToPutLmdbItem');
  }

  if (!!fresh && !Array.isArray(fresh)) {
    throw new Error('ExpectedFreshAttributesAsArray');
  }

  if (!key) {
    throw new Error('ExpectedKeyToPutLmdbItem');
  }

  if (!lmdb) {
    throw new Error('ExpectedLmdbToPutLmdbItem');
  }

  if (!value) {
    throw new Error('ExpectedValueToPutLmdbItem');
  }

  let database;

  try {
    database = lmdb.registerDb({db});
  } catch (err) {
    throw err;
  }

  const stringified = stringify(value);

  const tx = lmdb.env.beginTxn();

  const data = tx.getString(database, key);

  const parsed = !fresh && !!data ? null : parse(data);

  if (!!parsed && !!fresh.find(attr => parsed[attr] !== undefined)) {
    tx.commit();

    throw new Error('ExpectedFreshAttributeWhenPuttingItem');
  }

  // Exit early when the data to be put is already there
  if (data === stringified) {
    return tx.commit();
  }

  // Delete any data currently present
  if (data !== null) {
    tx.del(database, key);
  }

  tx.putString(database, key, stringified);

  tx.commit();

  return;
};

