'use strict';

/******************************************************************************
Modified versino of https://github.com/jakesgordon/bin-packing/blob/master/js/packer.growing.js
MIT License

This is a binary tree based bin packing algorithm that is more complex than
the simple Packer (packer.js). Instead of starting off with a fixed width and
height, it starts with the width and height of the first block passed and then
grows as necessary to accomodate each subsequent block. As it grows it attempts
to maintain a roughly square ratio by making 'smart' choices about whether to
grow right or down.

When growing, the algorithm can only grow to the right OR down. Therefore, if
the new block is BOTH wider and taller than the current target then it will be
rejected. This makes it very important to initialize with a sensible starting
width and height. If you are providing sorted input (largest first) then this
will not be an issue.

A potential way to solve this limitation would be to allow growth in BOTH
directions at once, but this requires maintaining a more complex tree
with 3 children (down, right and center) and that complexity can be avoided
by simply chosing a sensible starting block.

Best results occur when the input blocks are sorted by height, or even better
when sorted by max(width,height).

Inputs:
------

  blocks: array of any objects that have ._w and ._h attributes

Outputs:
-------

  marks each block that fits with a ._fit attribute pointing to a
  node with ._x and ._y coordinates

Example:
-------

  var blocks = [
    { w: 100, h: 100 },
    { w: 100, h: 100 },
    { w:  80, h:  80 },
    { w:  80, h:  80 },
    etc
    etc
  ];

  var packer = new GrowingPacker();
  packer._fit(blocks);

  for(var n = 0 ; n < blocks.length ; n++) {
    var block = blocks[n];
    if (block._fit) {
      Draw(block._fit._x, block._fit._y, block._w, block._h);
    }
  }

******************************************************************************/

export default class GrowingPacker {
  constructor() {}

  fit (blocks, aspectRatio) {
    var n, node, block, len = blocks.length;
    var _w = len > 0 ? blocks[0]._w : 0;
    var _h = len > 0 ? blocks[0]._h : 0;

    this.aspectRatio = aspectRatio || 1;
    this.root = { _x: 0, _y: 0, _w: _w, _h: _h };

    for (n = 0; n < len ; n++) {
      block = blocks[n];
      node = this.findNode(this.root, block._w, block._h);
      if (node)
        block._fit = this.splitNode(node, block._w, block._h);
      else
        block._fit = this.growNode(block._w, block._h);
    }
  }

  findNode(root, w, h) {
    if (root.used)
      return this.findNode(root.right, w, h) || this.findNode(root.down, w, h);
    else if ((w <= root._w) && (h <= root._h))
      return root;
    else
      return null;
  }

  splitNode(node, w, h) {
    node.used = true;

    node.down  = {
      _x: node._x,
      _y: node._y + h,
      _w: node._w,
      _h: node._h - h
    };

    node.right = {
      _x: node._x + w,
      _y: node._y,
      _w: node._w - w,
      _h: h
    };

    return node;
  }

  growNode(w, h) {
    var canGrowDown = (w <= this.root._w);
    var canGrowRight = (h <= this.root._h);
     // attempt to keep to aspect ratio by growing right when height is much greater
     // than width
    var ratioIfGrowRight = this.root._h / (this.root._w + w);
    var shouldGrowRight = canGrowRight && (ratioIfGrowRight > this.aspectRatio);

    // attempt to keep aspect ratio by growing down when width is much greater
    //than height
    var ratioIfGrowDown = this.root._w / (this.root._h + h);
    var shouldGrowDown  = canGrowDown  && (ratioIfGrowDown > this.aspectRatio);

    if (shouldGrowRight)
      return this.growRight(w, h);
    else if (shouldGrowDown)
      return this.growDown(w, h);
    else if (canGrowRight)
     return this.growRight(w, h);
    else if (canGrowDown)
      return this.growDown(w, h);
    else {
      console.error('Unable to grow');
      return null; // need to ensure sensible root starting size to avoid this happening
    }
  }

  growRight(w, h) {
    var node;

    this.root = {
      used: true,
      _x: 0,
      _y: 0,
      _w: this.root._w + w,
      _h: this.root._h,
      down: this.root,
      right: { _x: this.root._w, _y: 0, _w: w, _h: this.root._h }
    };
    node = this.findNode(this.root, w, h);
    if (node) {
      return this.splitNode(node, w, h);
    } else {
      console.error('Unable to grow right');
      return null;
    }
  }

  growDown(w, h) {
    var node;

    this.root = {
      used: true,
      _x: 0,
      _y: 0,
      _w: this.root._w,
      _h: this.root._h + h,
      down:  { _x: 0, _y: this.root._h, _w: this.root._w, _h: h },
      right: this.root
    };
    node = this.findNode(this.root, w, h);
    if (node) {
      return this.splitNode(node, w, h);
    } else {
      console.error('Unable to grow down');
      return null;
    }
  }
}
