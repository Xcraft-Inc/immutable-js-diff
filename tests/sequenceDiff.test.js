'use strict';

var diff = require('../src/diff');
var Immutable = require('immutable');
var JSC = require('jscheck');
var assert = require('assert');

describe('xcraft.immutablediff.sequence-diff', function() {
  var failure = null;

  before(function () {
    JSC.on_report(function (report) {
      console.log(report);
    });

    JSC.on_fail(function (jsc_failure) {
      failure = jsc_failure;
    });
  });

  afterEach(function () {
    if(failure){
      console.error(failure);
      throw failure;
    }
  });

  it('check properties', function () {
    JSC.test(
      'returns [] when equal',
      function(veredict, array){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);

        var result = Immutable.fromJS(diff(list1, list2));

        return veredict(result.count() === 0);
      },
      [
        JSC.array(5, JSC.integer())
      ]
    );
  });

  it('returns add operation', function () {
    var list1 = Immutable.fromJS([1,2,3,4]);
    var list2 = Immutable.fromJS([1,2,3,4,5]);

    var result = Immutable.fromJS(diff(list1, list2));
    var expected = Immutable.fromJS([{op: '+', path: ['4'], value: 5}]);

    assert.ok(Immutable.is(result, expected));
  });

  it('returns remove operation', function () {
    var list1 = Immutable.fromJS([1,2,3,4]);
    var list2 = Immutable.fromJS([1,2,4]);

    var result = Immutable.fromJS(diff(list1, list2));
    var expected = Immutable.fromJS([{op: '-', path: ['2']}]);

    assert.ok(Immutable.is(result, expected));
  });

  it('returns add/remove operations', function () {
    var list1 = Immutable.fromJS([1,2,3,4]);
    var list2 = Immutable.fromJS([1,2,4,5]);

    var result = Immutable.fromJS(diff(list1, list2));
    var expected = Immutable.fromJS([
      {op: '!=', path: ['2'], value: 4},
      {op: '!=', path: ['3'], value: 5}
    ]);

    assert.ok(Immutable.is(result, expected));
  });

  it('returns correct diff when removing sequenced items in large list', function(){
    var list1 = Immutable.Range(1, 1000);
    var list2 = Immutable.Range(1, 900);

    var expected = Immutable.Repeat(Immutable.fromJS({ op: '-', path: ['899'] }), 100);

    var result = Immutable.fromJS(diff(list1, list2));

    assert.ok(Immutable.is(result, expected));
  });

  it('returns correct diff when removing multiple sequenced items in large list', function(){
    var list1 = Immutable.Range(1, 1000);
    var list2 = Immutable.Range(1, 900).concat(Immutable.Range(950, 955));

    var expected = Immutable.List([
      Immutable.fromJS({ op: "!=", path: ["899"], value: 950 }),
      Immutable.fromJS({ op: "!=", path: ["900"], value: 951 }),
      Immutable.fromJS({ op: "!=", path: ["901"], value: 952 }),
      Immutable.fromJS({ op: "!=", path: ["902"], value: 953 }),
      Immutable.fromJS({ op: "!=", path: ["903"], value: 954 })
    ]).concat(Immutable.Repeat(Immutable.fromJS({ op: '-', path: ['904'] }), 95));

    var result = Immutable.fromJS(diff(list1, list2));

    assert.ok(Immutable.is(result, expected));
  });

  it('returns one op diff when changing more than 5/9 items in large list', function(){
    var list1 = Immutable.Range(0, 1000);
    var list2 = Immutable.Range(0, 1000, 2);

    var expected = Immutable.fromJS([
      {op: '!=', path: [], value: list2.toJS()}
    ]);

    var result = Immutable.fromJS(diff(list1, list2));

    assert.ok(Immutable.is(result, expected));
  });

  it('returns usual ops diff when changing less than 5/9 items in large list', function(){
    var list1 = Immutable.Range(0, 1000);
    var list2 = Immutable.Range(0, 500).concat(Immutable.Range(0, 500));

    var expected = Immutable.List(
      new Array(500).fill().map((_, index) => Immutable.fromJS({ op: "!=", path: [`${index+500}`], value: index }))
    )

    var result = Immutable.fromJS(diff(list1, list2));

    assert.ok(Immutable.is(result, expected));
  });

  it('JSCheck', function () {
    JSC.test(
      'returns add when value is inserted in the middle of sequence',
      function(veredict, array, addIdx, newValue){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var modifiedList = list2.splice(addIdx, 0, newValue);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.fromJS([
          {op: '+', path: [''+addIdx], value: newValue}
        ]);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(10, JSC.integer()),
        JSC.integer(0, 9),
        JSC.integer()
      ]
    );

    JSC.test(
      'returns remove',
      function(veredict, array, removeIdx){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var modifiedList = list2.splice(removeIdx, 1);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.fromJS([
          {op: '-', path: [''+removeIdx]}
        ]);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(10, JSC.integer()),
        JSC.integer(0, 9)
      ]
    );

    JSC.test(
      'returns sequential removes',
      function(veredict, array, nRemoves){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var modifiedList = list2.skip(nRemoves);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.Repeat(Immutable.fromJS({op: '-', path: ['0']}), nRemoves);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(10, JSC.integer()),
        JSC.integer(1, 5)
      ]
    );

    JSC.test(
      'returns replace operations',
      function(veredict, array, replaceIdx, newValue){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var modifiedList = list2.set(replaceIdx, newValue);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.fromJS([
          {op: '!=', path: [''+replaceIdx], value: newValue}
        ]);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(10, JSC.integer()),
        JSC.integer(0, 9),
        JSC.integer()
      ]
    );
  });

  it('large sequence diff', function() {
    JSC.test(
      'returns add',
      function(veredict, array, newValue){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var modifiedList = list2.push(newValue);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.fromJS([
          {op: '+', path: [''+array.length], value: newValue}
        ]);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(150, JSC.integer()),
        JSC.integer()
      ]
    );

    JSC.test(
      'returns replace',
      function(veredict, array, newValue){
        var list1 = Immutable.fromJS(array);
        var list2 = Immutable.fromJS(array);
        var idx = 100;
        var modifiedList = list2.set(idx, newValue);

        var result = Immutable.fromJS(diff(list1, modifiedList));
        var expected = Immutable.fromJS([
          {op: '!=', path: [''+idx], value: newValue}
        ]);

        return veredict(Immutable.is(result, expected));
      },
      [
        JSC.array(150, JSC.integer()),
        JSC.integer()
      ]
    );
  });

  it('Seq test', function(){
    var setDiff = Immutable.fromJS(diff(Immutable.Set(['1']), Immutable.Set(['1'])));
    assert.equal(setDiff.size, 0);

    setDiff = Immutable.fromJS(diff(Immutable.Set([1]), Immutable.Set([1,2,3])));
    var expected = Immutable.fromJS([
      {op: '!=', path: [], value: [1,2,3]}
    ]);

    assert.ok(Immutable.is(setDiff, expected));
  });
});