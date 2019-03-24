const {test} = require('tap');

const isMatchingWhere = require('./../../lmdb/is_matching_where');

const tests = [
  // Test equality
  {
    args: {data: {foo: true}, where: {foo: {eq: true}}},
    description: 'Test checking attribute is true',
    expected: true,
  },

  // Test inequality
  {
    args: {data: {foo: true}, where: {foo: {eq: false}}},
    description: 'Test checking attribute is false',
    expected: false,
  },

  // Test greater than
  {
    args: {data: {foo: 1}, where: {foo: {gt: 0}}},
    description: 'Test greater than is true',
    expected: true,
  },

  // Test less than
  {
    args: {data: {foo: 1}, where: {foo: {gt: 2}}},
    description: 'Test greater than is false',
    expected: false,
  },

  // Test starts with
  {
    args: {data: {foo: 'abc'}, where: {foo: {starts_with: 'a'}}},
    description: 'Test starts with is true',
    expected: true,
  },

  // Test starts with
  {
    args: {data: {foo: 'abc'}, where: {foo: {starts_with: 'b'}}},
    description: 'Test starts with is false',
    expected: false,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({end, equal}) => {
    equal(isMatchingWhere(args), expected, 'Data matches where');

    return end();
  });
});
