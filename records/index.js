const closeChannel = require('./close_channel');
const getAllNodes = require('./get_all_nodes');
const getChannelHistory = require('./get_channel_history');
const getChannelRecord = require('./get_channel_record');
const getChannelUpdates = require('./get_channel_updates');
const getChannelsForNode = require('./get_channels_for_node');
const getEdgeHistory = require('./get_edge_history');
const getNodeRecord = require('./get_node_record');
const recordEdgeActivity = require('./record_edge_activity');
const setChannelRecord = require('./set_channel_record');
const updateChannel = require('./update_channel');
const updateNode = require('./update_node');

/** Graph persistent records
*/
module.exports = {
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

