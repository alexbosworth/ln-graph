const BN = require('bn.js');

const blockIndexByteLength = 4;
const decBase = 10;
const heightByteLength = 4;
const indexByteLength = 4;
const outputIndexByteLength = 2;
const shortChannelIdByteLength = 8;

/** Decode a short channel id into components

  {
    id: <BOLT 7 Encoded Short Channel Id Buffer Object>
  }

  @throws
  <Error>

  @returns
  <Short Channel Id Number String>
*/
module.exports = ({id}) => {
  if (!Buffer.isBuffer(id)) {
    throw new Error('ExpectedChannelIdBuffer');
  }

  const height = Buffer.alloc(heightByteLength);
  const index = Buffer.alloc(blockIndexByteLength);
  const vout = Buffer.alloc(outputIndexByteLength);

  // Skip the first byte of height, which will be zero due to BE 3byte encoding
  id.copy(height, 1);

  // Skip the first byte of index, also zero. Write into id after the 3rd byte
  id.copy(index, 1, 3);

  // Write the vout into the final 2 bytes
  id.copy(vout, 0, 6);

  const channel = {
    block_height: height.readUInt32BE(0),
    block_index: index.readUInt32BE(0),
    output_index: vout.readUInt16BE(0),
  };

  {
    const shortId = Buffer.alloc(shortChannelIdByteLength);

    const height = Buffer.alloc(heightByteLength);

    height.writeUInt32BE(channel.block_height);

    // Skip the 1st byte of the BE height number so that only 3 bytes are used
    height.copy(shortId, 0, 1);

    const index = Buffer.alloc(indexByteLength);

    index.writeUInt32BE(channel.block_index);

    // Skip the 1st byte of the BE index number, pull from after the height bytes
    index.copy(shortId, 3, 1);

    // Bring in the final 2 bytes which are the output index
    shortId.writeUInt16BE(channel.output_index, 6);

    return new BN(shortId).toString(decBase);
  }
};

