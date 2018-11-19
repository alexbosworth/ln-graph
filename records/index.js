const getChannelHistory = require('./get_channel_history');
const getSpendActivity = require('./get_spend_activity');
const recordSpendActivity = require('./record_spend_activity');
const updateChannel = require('./update_channel');
const updateNode = require('./update_node');

module.exports = {
  getChannelHistory,
  getSpendActivity,
  recordSpendActivity,
  updateChannel,
  updateNode,
};

