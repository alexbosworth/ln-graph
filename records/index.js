const closeChannel = require('./close_channel');
const getAllNodes = require('./get_all_nodes');
const getChanRecordsForNode = require('./get_chan_records_for_node');
const getChannelHistory = require('./get_channel_history');
const getChannelRecord = require('./get_channel_record');
const getChannelUpdates = require('./get_channel_updates');
const getEdgeRecords = require('./get_edge_records');
const getNodeRecord = require('./get_node_record');
const recordEdgeActivity = require('./record_edge_activity');
const setChannelRecord = require('./set_channel_record');
const updateChannel = require('./update_channel');
const updateNode = require('./update_node');

/** Records are items in lmdb
*/
module.exports = {
  closeChannel,
  getAllNodes,
  getChanRecordsForNode,
  getChannelHistory,
  getChannelRecord,
  getChannelUpdates,
  getEdgeRecords,
  getNodeRecord,
  recordEdgeActivity,
  setChannelRecord,
  updateChannel,
  updateNode,
};

