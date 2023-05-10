const {test} = require('@alexbosworth/tap');

const {dateForDecrementingNumber} = require('./../../dates');

const tests = [
  {
    args: {number: 'fffffee2abe70f3f'},
    description: 'Convert a decrementing number to a date',
    expected: {date: '2008-10-31T18:10:00.000Z'},
  },
  {
    args: {number: 'fffffee14849281f'},
    description: 'Convert a decrementing number to a later date',
    expected: {date: '2009-01-08T19:27:40.000Z'},
  },
  {
    args: {number: undefined},
    description: 'Converting a number requires a number',
    error: 'ExpectedHexEncodedDecrementingDateNumber',
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, ({equal, end, throws}) => {
    if (!!error) {
      throws(() => dateForDecrementingNumber(args), new Error(error), 'Err');
    } else {
      const {date} = dateForDecrementingNumber(args);

      equal(date, expected.date, 'Derived date from decrementing number');
    }

    return end();
  });
});

