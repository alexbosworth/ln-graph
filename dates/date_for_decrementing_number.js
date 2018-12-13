const BN = require('bn.js');

const {hexBase} = require('./constants');
const {maxUint64} = require('./constants');

const uint64ByteLen = Buffer.from(maxUint64, 'hex').length;

/** Derive a decrementing number for date

  {
    number: <Hex Encoded Number String>
  }

  @throws
  <Error>

  @returns
  {
    date: <ISO 8601 Encoded Date String>
  }
*/
module.exports = ({number}) => {
  if (!number || number.length === uint64ByteLen) {
    throw new Error('ExpectedHexEncodedDecrementingDateNumber');
  }

  const bigNumber = new BN(maxUint64, hexBase).sub(new BN(number, hexBase));

  return {date: new Date(bigNumber.toNumber()).toISOString()};
};

