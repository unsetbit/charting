'use strict';

import * as d3 from 'd3';
import GrowingPacker from './GrowingPacker';
import { generateFakeData, generateTree } from './test';

// Rectangular packing layout for d3, requires D3
export default class RectanglePacker {
  constructor(state) {
    this.state = Object.assign({
      sort: (a, b) => b.value - a.value,
      aspectRatio: 1,
      minGroupWidth: 1,
      unitSize: 10,
      unitPadding: 0,
      groupPadding: { top: 10, bottom: 10, left: 10, right: 10 },
      groupMargin: { top: 20, bottom: 20, left: 20, right: 20 },
      unitPackConstraints: null
    }, state);
  }

  pack(root) {
    const state = this.state;
    const sort = state.sort;
    const groupPadding = state.groupPadding;
    const groupMargin = state.groupMargin;
    const unitSize = state.unitSize;
    const unitPadding = state.unitPadding;

    const rootNode = d3.hierarchy(root).sort(sort);

    rootNode.eachAfter(d => {
      if (d.children) {
        d._padding = groupPadding;
        d._margin = groupMargin;
      } else {
        d._w = unitSize;
        d._h = unitSize;
        d._padding = unitPadding;
      }
    });

    rootNode._x = 0;
    rootNode._y = 0;

    rootNode.eachAfter(this.d3LayoutPackSiblings.bind(this));

    // Update the child positions according to their parent offsets
    this.shiftChildren(rootNode);
    return rootNode;
  }

  // Returns an array source+target objects for the specified nodes.
  d3LayoutHierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {source: parent, target: child};
      });
    }));
  }

  // Post-order traversal.
  d3LayoutHierarchyVisitAfter(node, callback) {
    var nodes = [node], nodes2 = [], children, n;
    while ((node = nodes.pop()) != null) {
      nodes2.push(node);
      if ((children = node.children) && (n = children.length)) {
        var i = -1;
        while (++i < n) nodes.push(children[i]);
      }
    }
    while ((node = nodes2.pop()) != null) {
      callback(node);
    }
  }

  // Wraps the d3LayoutPackSiblings function, which packs children within a node
  // inorder to provide a configurable aspectRatio parameter to the growing packer
  // Packs all children within a node
  d3LayoutPackSiblings(node) {
    const state = this.state;
    const aspectRatio = state.aspectRatio;
    const unitPackConstraints = state.unitPackConstraints;
    const minGroupWidth = state.minGroupWidth;

    var nodes = node.children;
    if (!nodes) return;

    var n = nodes.length;
    if (!n) return;

    var i, child;

    node._area = 0;

    var firstChild = nodes[0];
    if (!firstChild.children) {
      var unitWidth = firstChild._w;
      var unitPadding = firstChild._padding;
      var unitsPerRow = Math.ceil(Math.sqrt(n));
      if(unitPackConstraints) {
        unitsPerRow = unitPackConstraints.getConstrainedUnitsPerRow(aspectRatio, n, unitsPerRow);
      }

      node._w = (unitsPerRow * (unitWidth + unitPadding)) + unitPadding;

      // Use top level aspect ratio if units are immediate children of the root
      // since they will be the ones visually filling in the container. If
      // the units have a grouping, make them a bit more square-ish, if they
      // have multiple groupings, make them fit actual squares.
      if (node.depth === 0) {
        if(unitPackConstraints) {
          node._w *= unitPackConstraints.getConstrainedAspectRatio(aspectRatio);
        } else {
          node._w *= aspectRatio;
        }
      } else if (node.depth === 1) {
        node._w *= 1 + (aspectRatio - 1) / 4;
      } else {
        node._w *= 1.3;
      }

      node._x = 0;
      node._y = 0;

      if (node._w < minGroupWidth) {
        node._w = minGroupWidth;
      }

      var currentX = node._x;
      var currentY = node._y + unitPadding;
      var initialY = currentY;
      var maxWidth = currentX + node._w;

      for (i = 0; i < n; i++) {
        child = nodes[i];

        currentX += unitPadding;

        child._x = currentX;
        child._y = currentY;

        currentX += child._w;

        if (currentX + child._w > maxWidth && (i + 1) < n ) {
          currentX = node._x;
          currentY += unitWidth + child._padding;
        }
      }

      node._h = (currentY + unitWidth + unitPadding) - node._y;

      if (initialY === currentY) {
        node._realW = currentX + unitPadding;
      } else {
        node._realW = node._w;
      }

      node._area = node._w * node._h;

      if (node.depth === 0) {
        node._x += node._padding.left;
        node._y += node._padding.top;
      }
    } else {
      nodes.forEach(function (child) {
        var horizontalPadding = child._padding.left + child._padding.right;
        var verticalPadding = child._padding.top + child._padding.bottom;

        var horizontalMargin = child._margin.left + child._margin.right;
        var verticalMargin = child._margin.top + child._margin.bottom;

        child._w += horizontalPadding + horizontalMargin;
        child._h += verticalPadding + verticalMargin;
      });

      nodes.sort(function(a, b) {
        return (b._w * b._h) - (a._w * a._h);
      });

      var packer = new GrowingPacker();

      packer.fit(nodes, aspectRatio);

      nodes.forEach(function(child) {
        var horizontalPadding = child._padding.left + child._padding.right;
        var verticalPadding = child._padding.top + child._padding.bottom;

        var horizontalMargin = child._margin.left + child._margin.right;
        var verticalMargin = child._margin.top + child._margin.bottom;

        child._w -= horizontalPadding + horizontalMargin;
        child._h -= verticalPadding + verticalMargin;

        child._x = child._fit._x + child._padding.left + child._margin.left;
        child._y = child._fit._y + child._padding.top + child._margin.top;
        node._area += child._area;
      });

      node._x += node._padding.left + node._margin.left;
      node._y += node._padding.top + node._margin.top;
      node._w = packer.root._w;
      node._h = packer.root._h;
    }
  }

  /**
    Shift all children of a node (and their children, recursively) according to
    the x/y positions of its parent.
  */
  shiftChildren(node) {
    if (!node.children) return;
    var children = node.children,
      i = 0,
      child = children[i++];

    while (child) {
      child._x += node._x;
      child._y += node._y;
      this.shiftChildren(child);
      child = children[i++];
    }
  }
}


(function () {
  const container = document.querySelector('.container')

  // Generate some fake data
   var nodes = generateFakeData(1000);

   function group(nodes, groupingProperties) {
     return nodes.reduce((root, cur) => {
       const groupings = groupingProperties.map(grouping => cur[grouping]);

       const leafGrouping = groupings.reduce((groups, name) => {
         let group = groups.find(g => g.name === name);
         if (group === undefined) {
           group = {
             name: name,
             children: []
           };

           groups.push(group);
         }

         return group.children;
       }, root.children);

       leafGrouping.push(cur);

       return root;
     }, { name: 'root', children: [] });
   }

   const root = group(nodes, ['state', 'ageGroup']);

   // Create the layout
   var packer = new RectanglePacker({
     unitSize: 10,
     unitPadding: 1,
     groupPadding: { top: 20, bottom: 10, left: 10, right: 10 }
   });
   // Layout nodes in the tree using rectangle packing
   var packed = packer.pack(root);
   // Create a svg element to contain our rendered elements
   var svg = d3.select(container).append("svg")
     .attr("height", 900)
     .attr("width", window.innerWidth - 10);
   // Color each node as if it's a heatmap
   var color = d3.scaleLinear()
       .domain([0, 20, 40, 60, 80, 100])
       .range(["#FF1923", "#FF6815", "#FFC311", "#DBFF0D", "#78FF09", "#13FF05"]);

   // Create elements for groups
   let groups = [];
   let units = [];
   packed.each(d => {
     if (d.children) {
       groups.push(d)
     } else {
       units.push(d);
     }
   });

   svg.selectAll("text")
     .data(groups)
     .enter()
     .append('text')
     .attr("transform", function(d) { return "translate(" + d._x + "," + d._y + ") scale(1)"; })
     .text(function (d) { return d.data.name; });
   // Create elements for units
   svg.selectAll("rect")
     .data(units)
     .enter()
       .append("rect")
       .attr("transform", function(d) { return "translate(" + d._x + "," + d._y + ") scale(1)"; })
       .attr("width", function(d) { return d._w; })
       .attr("height", function(d) { return d._h; })
       .attr("fill", function(d) {
         return color(d.data.color);
       });
})()
