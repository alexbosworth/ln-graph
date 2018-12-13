const {existsSync} = require('fs');
const {mkdirSync} = require('fs');

const {Env} = require('node-lmdb');

const dbs = {};
let env;
const maxDbs = 10;
const mapSize = 1024 * 1024 * 1024 * 2;

/** Get lmdb connection

  {
    path: <Lmdb Database Path String>
  }

  @throws
  <Error>

  @returns
  {
    env: <Open Lmdb Environment Object>
    registerDb: <Register Db Function> ({db: <Db Name String}) => ()
  }
*/
module.exports = ({path}, cbk) => {
  if (!path) {
    throw new Error('ExpectedPathForLmdbStorage');
  }

  if (!existsSync(path)) {
    mkdirSync(path);
  }

  if (!env) {
    const environment = new Env();

    environment.open({maxDbs, mapSize, path});

    env = environment;
  }

  const registerDb = ({db}) => {
    try {
      dbs[db] = dbs[db] || env.openDbi({create: true, name: db});
    } catch (err) {
      throw err;
    }

    return dbs[db];
  };

  return {env, registerDb};
};

