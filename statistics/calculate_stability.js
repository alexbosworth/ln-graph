const notFound = -1;
const numbers = ['1', '2'];
const {parse} = Date;

/** Cumulative down time for a channel

  Downtime is when a peer marks a node as disabled, but it's not reflected
  Uptime is when both peers are not marked as disabled

  {
    after: <Starting Date ISO 8601 Date String>
    before: <Ending Date ISO 8601 Date String>
    initially: [{is_online: <Is Online Bool>}]
    nodes: [<Node Public Key String>]
    updates: [{
      [node1_is_disabled]: <Edge is Disabled Bool>
      [node1_updated_at]: <Policy Updated At ISO 8601 Date String>
      [node2_is_disabled]: <Edge is Disabled Bool>
      [node2_updated_at]: <Policy Updated At ISO 8601 Date String>
    }]
  }

  @throws
  <Error>

  @returns
  {
    changes: [<Presence Change Count Number>]
    uptime: [<Uptime Milliseconds Number>]
  }
*/
module.exports = ({after, before, initially, nodes, updates}) => {
  if (!after) {
    throw new Error('ExpectedStartingDateForStabilityCalculation');
  }

  if (!before) {
    throw new Error('ExpectedEndingDateForStabilityCalculation');
  }

  if (!Array.isArray(initially) || initially.length !== numbers.length) {
    throw new Error('ExpectedInitialValuesForStabilityCalculation');
  }

  if (initially.findIndex(n => !n || n.is_online === undefined) !== notFound) {
    throw new Error('ExpectedInitialStateForStabilityCalculation');
  }

  if (!Array.isArray(nodes) || nodes.length !== numbers.length) {
    throw new Error('ExpectedNodesForStabilityCalculation');
  }

  if (!Array.isArray(updates)) {
    throw new Error('ExpectedUpdatesToCalculateStability');
  }

  const firstUpdate = numbers.map(number => {
    return updates.find(u => u[`node${number}_is_disabled`] !== undefined);
  });

  const state = numbers.map((number, i) => ({
    is_online: initially[i].is_online,
    presence_changed_at: after,
    presence_changed_count: [].length,
    uptime: 0,
  }));

  let lastNode1State = state[1].is_online;
  let lastNode2State = state[0].is_online;

  updates
    .slice()
    .reverse()
    .filter(update => {
      const updatedAt = [update.node1_updated_at, update.node2_updated_at];

      return !updatedAt.find(time => !!time && time < after);
    })
    .forEach(update => {
      const [node1State, node2State] = state;

      // Node 1 marks Node 2 as coming online
      if (update.node1_is_disabled === false && !!update.node1_updated_at) {
        if (!node2State.is_online) {
          node2State.is_online = true;
          node2State.presence_changed_at = update.node1_updated_at;
          node2State.presence_changed_count++;
        }
      }

      // Node 1 marks Node 2 as going offline
      if (update.node1_is_disabled && node2State.presence_changed_at) {
        if (!!node2State.is_online) {
          const node1Update = parse(update.node1_updated_at);
          const node2Updated = parse(node2State.presence_changed_at);

          node2State.uptime += node1Update - node2Updated;

          node2State.is_online = false;
          node2State.presence_changed_at = update.node1_updated_at;
          node2State.presence_changed_count++;
        }
      }

      // Node 2 marks Node 1 as coming online
      if (update.node2_is_disabled === false && !!update.node2_updated_at) {
        if (!node1State.is_online) {
          node1State.is_online = true;
          node1State.presence_changed_at = update.node2_updated_at;
          node1State.presence_changed_count++;
        }
      }

      // Node 2 marks Node 1 as going offline
      if (!!update.node2_is_disabled && !!update.node2_updated_at) {
        if (!!node1State.is_online) {
          const node1Updated = parse(node1State.presence_changed_at);
          const node2Update = parse(update.node2_updated_at);

          node1State.uptime += node2Update - node1Updated;

          node1State.is_online = false;
          node1State.presence_changed_at = update.node2_updated_at;
          node1State.presence_changed_count++;
        }
      }
    });

  state
    .filter(n => n.is_online)
    .forEach(n => n.uptime += parse(before) - parse(n.presence_changed_at));

  return {
    changes: state.map(n => n.presence_changed_count),
    uptime: state.map(({uptime}) => uptime),
  };
};

