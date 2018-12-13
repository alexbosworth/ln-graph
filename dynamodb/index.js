const ddb = require('./ddb');
const getDdbItem = require('./get_ddb_item');
const putDdbItem = require('./put_ddb_item');
const queryDdb = require('./query_ddb');
const updateDdbItem = require('./update_ddb_item');

/** Dynamodb Access
*/
module.exports = {ddb, getDdbItem, putDdbItem, queryDdb, updateDdbItem};

