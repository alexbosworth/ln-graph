const {getLmdbItem} = require('./../lmdb');
const {lmdb} = require('./../lmdb');
const {nodesDb} = require('./constants');
const {pkHexLen} = require('./constants');

/** Get node

  {
    lmdb_path: <LMDB Path String>
    public_key: <Public Key String>
  }

  @throws
  <Error>

  @returns
  {
    [node]: {
      alias: <Alias String>
      color: <Color String>
      [sockets]: [<Socket String>]
      updated_at: <ISO 8601 Date String>
    }
  }
*/
module.exports = args => {
  if (!args.lmdb_path) {
    throw new Error('ExpectedLmdbPathToGetNode');
  }

  if (!args.public_key || args.public_key.length !== pkHexLen) {
    throw new Error('ExpectedPublicKeyToGetNode');
  }

  const db = nodesDb;
  const key = args.public_key;

  try {
    const {item} = getLmdbItem({db, key, lmdb: lmdb({path: args.lmdb_path})});

    if (!item) {
      return {};
    }

    return {
      node: {
        alias: item.alias,
        color: item.color,
        sockets: item.sockets,
        updated_at: item.updated_at,
      },
    };
  } catch (err) {
    throw new Error('FailedToGetNodeRecordDetails');
  }
};

