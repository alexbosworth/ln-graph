const {chanAttributes} = require('./constants');
const {nodeNumbers} = require('./constants');

/** Channel with updates reflected if present

  {
    item: {
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node1_is_disabled]: <Policy is Disabled Bool>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_public_key]: <Policy Public Key String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node2_is_disabled]: <Policy is Disabled Bool>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_public_key]: <Policy Public Key String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }
    update: {
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node1_is_disabled]: <Policy is Disabled Bool>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_public_key]: <Policy Public Key String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node2_is_disabled]: <Policy is Disabled Bool>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_public_key]: <Policy Public Key String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }
  }

  @throws
  <Error>

  @returns
  {
    updated: {
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node1_is_disabled]: <Policy is Disabled Bool>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_public_key]: <Policy Public Key String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node2_is_disabled]: <Policy is Disabled Bool>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_public_key]: <Policy Public Key String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }
    updates: {
      [node1_base_fee_mtokens]: <Base Fee Millitokens String>
      [node1_cltv_delta]: <CLTV Delta Number>
      [node1_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node1_is_disabled]: <Policy is Disabled Bool>
      [node1_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node1_public_key]: <Policy Public Key String>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_base_fee_mtokens]: <Base Fee Millitokens String>
      [node2_cltv_delta]: <CLTV Delta Number>
      [node2_fee_rate]: <Fee Rate Millitokens Per Million Number>
      [node2_is_disabled]: <Policy is Disabled Bool>
      [node2_min_htlc_mtokens]: <Minimum HTLC Millitokens String>
      [node2_public_key]: <Policy Public Key String>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }
  }
*/
module.exports = ({item, update}) => {
  if (!item) {
    throw new Error('ExpectedItemToBaseUpdatesOn');
  }

  if (!update) {
    throw new Error('ExpectedUpdatesToApplyToExistingItem');
  }

  const updated = {}; // Final state
  const updates = {}; // Changes made

  nodeNumbers
    .filter(n => { // Make sure the update is newer
      const date = `node${n}_updated_at`;

      return update[date] > (item[date] || '');
    })
    .forEach(n => { // Go through each node to look for updates 
      return chanAttributes.map(k => `node${n}_${k}`).forEach(attribute => {
        // Keep track of updated attributes individually
        if (item[attribute] !== update[attribute]) {
          updates[attribute] = update[attribute];
        }

        // Apply fields to the final updated state
        if (update[attribute] !== undefined || item[attribute] !== undefined) {
          updated[attribute] = update[attribute] || item[attribute];
        }

        return;
      });
    });

  // Exit early when there is nothing changed
  if (Object.keys(updates).length <= [update].length) {
    return {};
  }

  return {updated, updates};
};

