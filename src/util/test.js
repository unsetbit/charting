var states = [
  'Washington',
  'California',
  'Oregon',
  'Nevada',
  'New York',
  'Georgia',
  'Massachusetts',
  'Idaho'
];

var ageGroups = [
  '0-18',
  '18-62',
  '62+',
];

var pets = [
  'Cat',
  'Dog',
  'Bird',
  'Potato'
];

export {
  generateFakeData,
  generateTree
};

function generateNode(nodeId) {
  return {
    color: 0 + (Math.random() * 100),
    value: Math.random(),
    name: 'individual-' + nodeId,
    id: 'individual-' + nodeId,
    state: states[Math.floor(Math.random() * states.length)],
    ageGroup: ageGroups[Math.floor(Math.random() * ageGroups.length)],
    pet: pets[Math.floor(Math.random() * pets.length)]
  };
}

function generateFakeData(numberOfNodes) {
  var results = [];
  while (numberOfNodes--) {
      results.push(generateNode(numberOfNodes));
  }

  results.sort(function(a, b){
    return a.value - b.value;
  });
  return results;
}

function generateTree(nodes, groupBy, filter, secondaryGroup) {
  var selectedNodes = nodes;

  if (filter) {
    var filterParts = filter.split('.');
    selectedNodes = nodes.filter(function(node){
      return node[filterParts[0]] === filterParts[1];
    });
  }

  if (!groupBy) {
    return {
      id: filter || 'All',
      name: filter || 'All',
      children: selectedNodes
    };
  }

  var groups = {};
  selectedNodes.forEach(function(node) {
    var groupName = node[groupBy];

    groups[groupName] = groups[groupName] || [];
    groups[groupName].push(node);
  });

  var data = {
    id: filter || 'All',
    name: filter || 'All'
  };

  data.children = Object.keys(groups).map(function(groupName) {
    var group = groups[groupName];
    var children;

    if (secondaryGroup) {
      var sGroups = {};
      group.forEach(function(node) {
        var groupName = node[secondaryGroup];
        sGroups[groupName] = sGroups[groupName] || [];
        sGroups[groupName].push(node);
      });

      children = Object.keys(sGroups).map(function(sGroupName) {
        var sGroup = sGroups[sGroupName];

        return {
          name: sGroupName,
          id: groupName + ', ' + sGroupName,
          children: sGroup
        };
      });
    } else {
      children = group;
    }

    return {
      id: groupName,
      name: groupName,
      children: children
    };
  });

  return data;
}
