'use strict';

var Immutable = require('immutable');

var isMap = function(obj){ return Immutable.Iterable.isKeyed(obj); };
var isIndexed = function(obj) { return Immutable.Iterable.isIndexed(obj); };

var op = function(operation, path, value){
  if(operation === '-') { return { op: operation, path: path }; }

  return { op: operation, path: path, value: Immutable.isImmutable(value) ? value.toJS() : value };
};

module.exports = {
  isMap: isMap,
  isIndexed: isIndexed,
  op: op
};
