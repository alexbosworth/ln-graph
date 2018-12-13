const BN = require('bn.js');

const {decBase} = require('./constants');
const {endian} = require('./constants');
const {hexBase} = require('./constants');
const {maxUint64} = require('./constants');

const {parse} = Date;
const uint64ByteLen = Buffer.from(maxUint64, 'hex').length;

/** Derive a decrementing number for date

  {
    date: <ISO 8601 Date String>
  }

  @throws
  <Error>

  @returns
  {
    number: <Hex Encoded Date Number String>
  }
*/
module.exports = ({date}) => {
  if (!date) {
    throw new Error('ExpectedDateToDeriveDecrementingNumber');
  }

  const number = new BN(maxUint64, hexBase).sub(new BN(parse(date), decBase));

  return {number: number.toBuffer(endian, uint64ByteLen).toString('hex')};
};

