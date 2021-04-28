const {test} = require('tap');

const {decrementingNumberForDate} = require('./../../dates');

const tests = [
  {
    args: {date: '2008-10-31T18:10:00.000Z'},
    description: 'Convert date into decrementing number',
    expected: {number: 'fffffee2abe70f3f'},
  },
  {
    args: {date: '2009-01-08T19:27:40.000Z'},
    description: 'Convert a later date into decrementing number',
    expected: {number: 'fffffee14849281f'},
  },
  {
    args: {date: undefined},
    description: 'A date is expected to convert to a decrementing number',
    error: 'ExpectedDateToDeriveDecrementingNumber',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({equal, end, throws}) => {
    if (!!error) {
      throws(() => decrementingNumberForDate(args), new Error(error), 'Err');
    } else {
      const {number} = decrementingNumberForDate(args);

      equal(number, expected.number, 'Derived decrementing number for date');
    }

    return end();
  });
});

