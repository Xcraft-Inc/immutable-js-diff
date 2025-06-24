'use strict';

var Immutable = require('immutable');
var utils = require('./utils');
var lcs = require('./lcs');
var op = utils.op,
    isMap = utils.isMap,
    isIndexed = utils.isIndexed;

var mapDiff = function(a, b, p){
  var ops = [];
  var path = p ? (Array.isArray(p) ? p : [p]) : [];

  if(Immutable.is(a, b) || (a == b == null)){ return ops; }

  var areLists = isIndexed(a) && isIndexed(b);
  var lastKey = null;
  var removeKey = null

  /* Replace the whole list if it seems that a lot of entries have changed */
  if (areLists) {
    const aCnt = a.count();
    const bCnt = b.count();
    const ratio = (1 - Math.min(aCnt, bCnt) / Math.max(aCnt, bCnt)) * 100;
    /* Replace the whole list if the length has changed of at least 50% */
    if (ratio >= 50){
      ops.push(op('!=', path, b));
      return ops;
    }
    const len = aCnt > bCnt ? bCnt : aCnt;
    if (len >= 9){
      const step = Math.round(len / 9);
      const steps = [0, step, step*2, step*3, step*4, step*5, step*6, step*7, len - 1];
      const results = steps.map((step) => diff(a.get(step), b.get(step)).length).filter((len) => len !== 0).length;
      if(results >= 5){
        ops.push(op('!=', path, b));
        return ops;
      }
    }
  }

  if(a.forEach){
    a.forEach(function(aValue, aKey){
      if(b.has(aKey)){
        if(isMap(aValue) && isMap(b.get(aKey))){
          ops = ops.concat(mapDiff(aValue, b.get(aKey), path.concat(''+aKey)));
        }
        else if(isIndexed(b.get(aKey)) && isIndexed(aValue)){
          ops = ops.concat(sequenceDiff(aValue, b.get(aKey), path.concat(''+aKey)));
        }
        else {
          var bValue = b.get ? b.get(aKey) : b;
          var areDifferentValues = (aValue !== bValue);
          if (areDifferentValues) {
            ops.push(op('!=', path.concat(''+aKey), bValue));
          }
        }
      }
      else {
        if(areLists){
          removeKey = (lastKey != null && (lastKey+1) === aKey) ? removeKey : aKey;
          ops.push( op('-', path.concat(''+removeKey)) );
          lastKey = aKey;
        }
        else{
          ops.push( op('-', path.concat(''+aKey)) );
        }

      }
    });
  }

  b.forEach(function(bValue, bKey){
    if(a.has && !a.has(bKey)){
      ops.push( op('+', path.concat(''+bKey), bValue) );
    }
  });

  return ops;
};

var sequenceDiff = function (a, b, p) {
  var ops = [];
  var path = p ? (Array.isArray(p) ? p : [p]) : [];
  if(Immutable.is(a, b) || (a == b == null)){ return ops; }
  if((a.count() + 1) * (b.count() + 1) >= 10000 ) { return mapDiff(a, b, p); }

  var lcsDiff = lcs.diff(a, b);

  var pathIndex = 0;

  lcsDiff.forEach(function (diff) {
    if(diff.op === '='){ pathIndex++; }
    else if(diff.op === '!='){
      if(isMap(diff.val) && isMap(diff.newVal)){
        var mapDiffs = mapDiff(diff.val, diff.newVal, path.concat(''+pathIndex));
        ops = ops.concat(mapDiffs);
      }
      else{
        ops.push(op('!=', path.concat(''+pathIndex), diff.newVal));
      }
      pathIndex++;
    }
    else if(diff.op === '+'){
      ops.push(op('+', path.concat(''+pathIndex), diff.val));
      pathIndex++;
    }
    else if(diff.op === '-'){ ops.push(op('-', path.concat(''+pathIndex))); }
  });

  return ops;
};

var primitiveTypeDiff = function (a, b, p) {
  var path = p ? (Array.isArray(p) ? p : [p]) : [];
  if(a === b){ return []; }
  else{
    return [ op('!=', path, b) ];
  }
};

var diff = function(a, b, p){
  if(Immutable.is(a, b)){ return []; }
  if(a != b && (a == null || b == null)){ return [op('!=', [], b)]; }
  if(isIndexed(a) && isIndexed(b)){
    return sequenceDiff(a, b);
  }
  else if(isMap(a) && isMap(b)){
    return mapDiff(a, b);
  }
  else{
    return primitiveTypeDiff(a, b, p);
  }
};

module.exports = diff;
