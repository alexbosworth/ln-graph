const {test} = require('tap');

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
];

tests.forEach(({args, description, expected}) => {
  return test(description, ({equal, end}) => {
    const {date} = dateForDecrementingNumber(args);

    equal(date, expected.date, 'Derived date from decrementing number');

    return end();
  });
});

