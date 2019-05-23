const asyncAuto = require('async/auto');
const {returnResult} = require('asyncjs-util');

const {getChanRecordsForNode} = require('./../records');
const {getEdgeRecords} = require('./../records');

/** Get liquidity metrics for a node

  {
    after: <After Date String>
    lmdb_path: <LMDB Database Path String>
    network: <Network Name String>
    min_tokens: <Minimum Tokens For Outbound Liquidity Tokens Number>
    public_key: <Node Public Key Hex String>
  }

  @returns via cbk
  {
    peers: [{
      has_inbound_liquidity: <Has Inbound Liquidity Bool>
      has_outbound_liquidity: <Has Outbound Liquidity Bool>
      public_key: <Public Key Hex String>
    }]
  }
*/
module.exports = (args, cbk) => {
  return asyncAuto({
    // Check arguments
    validate: cbk => {
      if (!args.after) {
        return cbk([400, 'ExpectedAfterDateForMetricsCalculation']);
      }

      if (!args.network) {
        return cbk([400, 'ExpectedNetworkToGetNodeMetrics']);
      }

      if (args.min_tokens === undefined) {
        return cbk([400, 'EpxectedMinTokensForNodeMetricsCalculation']);
      }

      if (!args.public_key) {
        return cbk([400, 'ExpectedPublicKeyForNodeMetricsLookup']);
      }

      return cbk();
    },

    // Get the channels of a node
    getChannels: ['validate', ({}, cbk) => {
      try {
        return cbk(null, getChanRecordsForNode({
          lmdb_path: args.lmdb_path,
          network: args.network,
          public_key: args.public_key,
        }));
      } catch (err) {
        return cbk([500, 'FailedToRetrieveChannelsForNode', err]);
      }
    }],

    // Get edge histories
    getEdgeHistory: ['getChannels', ({getChannels}, cbk) => {
      const {channels} = getChannels;
      const peers = {};
      const pk = args.public_key;

      const largeChannels = channels
        .filter(n => !n.close_height)
        .filter(n => n.capacity > args.min_tokens);

      // Iterate through the node's channels to find traversal successes
      try {
        const histories = largeChannels.forEach(({id, policies}) => {
          return policies.filter(p => !!p.public_key).forEach(p => {
            const policy = policies.find(n => n.public_key === p.public_key);

            // Get the history of edge traversal attempts
            const {attempts} = getEdgeRecords({
              after: args.after,
              channel: id,
              limit: [policy.public_key].length,
              lmdb_path: args.lmdb_path,
              network: args.network,
              to_public_key: policy.public_key,
            });

            const [lastAttempt] = attempts;

            // Exit early when there has been no recorded attempt
            if (!lastAttempt) {
              return null;
            }

            const peerKey = policies.find(n => n.public_key !== pk).public_key;

            peers[peerKey] = peers[peerKey] || {};

            switch (lastAttempt.type) {
            case 'success':
              // Mark successful peer relationships as successful
              if (policy.public_key === peerKey) {
                peers[peerKey].outbound = true;
              } else {
                peers[peerKey].inbound = true;
              }
              break;

            case 'temporary_channel_failure':
              // Mark unsuccessful peer relationships as unsuccessful
              if (policy.public_key === peerKey && !peers[peerKey].outbound) {
                peers[peerKey].outbound = false;
              }

              if (policy.public_key !== peerKey && !peers[peerKey].inbound) {
                peers[peerKey].inbound = false;
              }
              break;

            default:
              break;
            }
          });
        });

        return cbk(null, peers);
      } catch (err) {
        return cbk([500, 'FailedToRetrieveEdgeHistory', err]);
      }
    }],

    // Overall Metrics
    metrics: ['getEdgeHistory', ({getEdgeHistory}, cbk) => {
      const peers = Object.keys(getEdgeHistory).map(key => {
        const peer = {public_key: key};

        if (getEdgeHistory[key].inbound !== undefined) {
          peer.has_inbound_liquidity = getEdgeHistory[key].inbound;
        }

        if (getEdgeHistory[key].outbound !== undefined) {
          peer.has_outbound_liquidity = getEdgeHistory[key].outbound;
        }

        return peer;
      });

      return cbk(null, {peers});
    }],
  },
  returnResult({of: 'metrics'}, cbk));
};

