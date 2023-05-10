const {calculateStability} = require('./statistics');
const {closeChannel} = require('./records');
const {getChannel} = require('./channels');
const {getChannelHistory} = require('./records');
const {getChannelsForNode} = require('./channels');
const {getEdgeHistory} = require('./edges');
const {getNode} = require('./nodes');
const {getNodeMetrics} = require('./statistics');
const {updateChannel} = require('./records');
const {updateNode} = require('./records');

/** Lightning Network graph utilties
*/
module.exports = {
  calculateStability,
  closeChannel,
  getChannel,
  getChannelHistory,
  getChannelsForNode,
  getEdgeHistory,
  getNode,
  getNodeMetrics,
  updateChannel,
  updateNode,
};
