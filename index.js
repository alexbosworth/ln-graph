const {calculateStability} = require('./statistics');
const {closeChannel} = require('./records');
const {getAllNodes} = require('./records');
const {getChannel} = require('./channels');
const {getChannelHistory} = require('./records');
const {getChannelRecord} = require('./records');
const {getChannelUpdates} = require('./records');
const {getChannelsForNode} = require('./records');
const {getEdgeHistory} = require('./records');
const {getNodeMetrics} = require('./statistics');
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
  getChannel,
  getChannelHistory,
  getChannelRecord,
  getChannelUpdates,
  getChannelsForNode,
  getEdgeHistory,
  getNodeMetrics,
  getNodeRecord,
  recordEdgeActivity,
  setChannelRecord,
  updateChannel,
  updateNode,
};

