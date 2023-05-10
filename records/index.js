const closeChannel = require('./close_channel');
const getChannelHistory = require('./get_channel_history');
const recordEdgeActivity = require('./record_edge_activity');
const updateChannel = require('./update_channel');
const updateNode = require('./update_node');

/** Records are items
*/
module.exports = {
  closeChannel,
  getChannelHistory,
  recordEdgeActivity,
  updateChannel,
  updateNode,
};
