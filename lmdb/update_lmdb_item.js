const addOperation = 'add';
const {parse} = JSON;
const removeOperation = 'remove';
const setOperation = 'set';
const {stringify} = JSON;

/** Update lmdb item

  {
    changes: <Changes Object>
    db: <Db Name String>
    [expect]: <Expect Object>
    key: <Item Key String>
    lmdb: <LMDB Object>
  }

  @throws
  <Error>
*/
module.exports = ({changes, db, expect, key, lmdb}) => {
  if (!changes) {
    throw new Error('ExpectedChangesForLmdbItemUpdate');
  }

  if (!db) {
    throw new Error('ExpectedDbNameToUpdateItemInLmdb');
  }

  if (!key) {
    throw new Error('ExpectedKeyForUpdateLmdbItem');
  }

  if (!lmdb) {
    throw new Error('ExpectedLmdbToUpdateLmdbItem');
  }

  let database;

  try {
    database = lmdb.registerDb({db});
  } catch (err) {
    throw err;
  }

  const tx = lmdb.env.beginTxn();

  // Get data
  const data = tx.getString(database, key);

  if (data === null) {
    tx.commit();

    throw new Error('ExpectedExistingRowToUpdate');
  }

  const item = parse(data);

  if (!!Object.keys(expect || {}).find(n => item[n] !== expect[n])) {
    tx.commit();

    throw new Error('FailedExpectAttributeCheck');
  }

  Object.keys(changes).forEach(attr => {
    return Object.keys(changes[attr]).forEach(type => {
      switch (type) {
      case (addOperation):
        if (Array.isArray(item[attr])) {
          item[attr].push(changes[attr][type]);
        } else {
          item[attr] += changes[attr][type];
        }
        break;

      case (removeOperation):
        delete item[attr];
        break;

      case (setOperation):
        item[attr] = changes[attr][type];
        break;

      default:
        tx.commit();
        throw new Error('UnexpectedChangeType');
      }
    });
  });

  tx.del(database, key);

  tx.putString(database, key, stringify(item));

  tx.commit();

  return;
};

