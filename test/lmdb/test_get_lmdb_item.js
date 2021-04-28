const {join} = require('path');
const {tmpdir} = require('os');

const removeDir = require('rimraf');
const {test} = require('tap');
const uuidv4 = require('uuid').v4;

const {getLmdbItem} = require('./../../lmdb');
const {lmdb} = require('./../../lmdb');
const {putLmdbItem} = require('./../../lmdb');

const path = join(tmpdir(), uuidv4());

const tests = [
  {
    args: {db: 'test-db', key: 'test-key', lmdb: lmdb({path})},
    description: 'Test getting an item',
    expected: {item: {test_value: 'test_value'}},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, strictSame}) => {
    putLmdbItem({
      db: args.db,
      key: args.key,
      lmdb: lmdb({path}),
      value: expected.item,
    });

    strictSame(getLmdbItem(args).item, expected.item, 'Got item from lmdb');

    lmdb({path}).kill({});

    return removeDir(path, () => end());
  });
});

