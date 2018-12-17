const {notFound} = require('./constants');

/** Changes for node

  {
    chain: <Chain Id String>
    [existing]: {
      [alias]: <Alias String>
      [chains]: [<Chain String>]
      [color]: <Color String>
      [sockets]: [<Socket String>]
      [updated_at]: <Updated At ISO 8601 String>
    }
    update: {
      [alias]: <Alias String>
      [chains]: [<Chain String>]
      [color]: <Color String>
      [sockets]: [<Socket String>]
      [updated_at]: <Updated At ISO 8601 String>
    }
  }

  @returns
  {
    [changes]: <Changes Object>
  }
*/
module.exports = ({chain, existing, update}) => {
  if (!existing) {
    return {};
  }

  // Exit early when an update is out of date
  if (existing.updated_at > update.updated_at) {
    return {};
  }

  const changes = {};

  if (existing.alias !== update.alias) {
    changes.alias = {set: update.alias};
  }

  if (update.alias === '') {
    changes.alias = {remove: true};
  }

  if (existing.chains.indexOf(chain) === notFound) {
    changes.chains = {add: chain};
  }

  if (existing.color !== update.color) {
    changes.color = {set: update.color};
  }

  const existingSockets = (existing.sockets || []).slice().sort();
  const sockets = (update.sockets || []).slice().sort();

  if (existingSockets.join() !== sockets.join()) {
    changes.sockets = !sockets.length ? {remove: true} : {set: sockets};
  }

  if (!Object.keys(changes).length) {
    return {};
  }

  changes.rev = {add: [update].length};
  changes.updated_at = {set: update.updated_at};

  return {changes};
};

