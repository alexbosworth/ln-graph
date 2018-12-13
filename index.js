const {calculateStability} = require('./statistics');
const {closeChannel} = require('./records');
const {getAllNodes} = require('./records');
const {getChannelHistory} = require('./records');
const {getChannelRecord} = require('./records');
const {getChannelUpdates} = require('./records');
const {getChannelsForNode} = require('./records');
const {getEdgeHistory} = require('./records');
const {getNodeRecord} = require('./records');
const {recordEdgeActivity} = require('./records');
const {setChannelRecord} = require('./records');
const {updateChannel} = require('./records');
const {updateNode} = require('./records');

/** Lightning Network graph utilties
*/
module.exports = {
  calculateStability,
  closeChannel,
  getAllNodes,
  getChannelHistory,
  getChannelRecord,
  getChannelUpdates,
  getChannelsForNode,
  getEdgeHistory,
  getNodeRecord,
  recordEdgeActivity,
  setChannelRecord,
  updateChannel,
  updateNode,
};

