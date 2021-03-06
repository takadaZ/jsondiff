'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

const tap = f => a => {
  f(a);
  return a;
};

const pipe = (fn, ...fns) => arg => fns.reduce((acc, fn2) => fn2(acc), fn(arg));

function recurse(cbCondition, cbRecurse) {
  function run(arg) {
    var _repeat = true;

    var _arg;

    while (_repeat) {
      _repeat = false;

      if (cbCondition(arg)) {
        _arg = cbRecurse(arg);
        arg = _arg;
        _repeat = true;
        continue;
      }

      return arg;
    }
  }

  return run;
}

function linkedListToArray(head, parentKey) {
  let next = Object.assign({}, head, {
    [parentKey]: head
  });
  return [...{
    *[Symbol.iterator]() {
      while (next = next[parentKey]) yield next;
    }

  }];
}

function init({
  a,
  b
}) {
  const [m, n] = [a.length, b.length];

  function orFlip({
    a,
    b
  }) {
    if (m >= n) {
      return {
        "a": b,
        "b": a,
        "m": n,
        "n": m,
        "flip": true
      };
    }

    return {
      a,
      b,
      m,
      n,
      "flip": false
    };
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return orFlip({
      a,
      b
    });
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return orFlip({
      a,
      b
    });
  }

  return orFlip({
    a: String(a),
    b: String(b)
  });
}

;

function unifiedResult({
  a,
  b,
  flip
}, head) {
  function getUndiff(x, undiffs) {
    if (undiffs > 0) {
      return [{
        "value": a.slice(x - undiffs, x),
        "added": false,
        "removed": false,
        "common": true
      }];
    }

    return [];
  }

  function getDiff(diffs, {
    x,
    y
  }) {
    if (diffs > 0) {
      return [{
        "value": a[x],
        "added": flip,
        "removed": !flip,
        "common": false
      }];
    }

    if (diffs < 0) {
      return [{
        "value": b[y],
        "added": !flip,
        "removed": flip,
        "common": false
      }];
    }

    return [];
  }

  const pathList = linkedListToArray(head, 'parent');
  return pathList.reduceRight((acc, {
    x,
    y,
    parent = {
      x: 0,
      y: 0
    }
  }) => {
    const diffX = x - parent.x;
    const diffY = y - parent.y;
    const ses = [...getDiff(diffX - diffY, parent), ...getUndiff(x, Math.min(diffX, diffY))];
    const last = acc[acc.length - 1];
    const next = ses[0];

    if (last && (last.added && next.added || last.removed && next.removed)) {
      return [...acc.slice(0, -1), {
        "value": last.value + next.value,
        "added": last.added,
        "removed": last.removed
      }, ...ses.slice(1)];
    }

    return [...acc, ...ses];
  }, []);
}

function onpPreSnake([k, p, pp]) {
  const [y, dir] = p > pp ? [p, -1] : [pp, 1];
  return [k, dir, y - k, y];
}

function Snake({
  a,
  b,
  m,
  n
}) {
  return ([k, dir, x1, y1]) => {
    const [x, y] = recurse(([x, y]) => x < m && y < n && a[x] === b[y], ([x, y]) => [x + 1, y + 1])([x1, y1]);
    return [k, dir, x, y];
  };
}

;

function diff(a, b) {
  const source = init({
    a,
    b
  });
  const {
    m,
    n
  } = source;
  const offset = m + 1;
  const delta = n - m;
  const kListMax = m + n + 3;
  const snake = Snake(source);
  const pathList = [];
  const kList = new Array(kListMax).fill({
    "k": -1,
    "fp": -1
  });

  function getFP(k) {
    return [k, kList[k - 1 + offset].fp + 1, kList[k + 1 + offset].fp];
  }

  function setPath([k, dir, x, y]) {
    kList[k + offset] = {
      "k": pathList.length,
      "fp": y
    };
    const parent = pathList[kList[k + dir + offset].k];
    pathList.push({
      x,
      y,
      parent
    });
  }

  function onpMain([init, condition, addK]) {
    recurse(condition, pipe(getFP, onpPreSnake, snake, tap(setPath), ([k]) => k + addK))(init);
  }

  function onp(n) {
    recurse(_ => kList[delta + offset].fp < n, p => {
      [[-p, k => k < delta, 1], [delta + p, k => k > delta, -1], [delta, k => k === delta, -1]].forEach(onpMain);
      return p + 1;
    })(0);
    return pathList[kList[delta + offset].k];
  }

  function ondInitXY(i) {
    const [pathMinus, pathPlus] = [pathList[i - 1], pathList[i + 1]];

    if (!pathMinus && !pathPlus) {
      return [0, 0, {
        x: 0,
        y: 0
      }];
    }

    if (!pathMinus || pathPlus && pathMinus.x < pathPlus.x) {
      return [pathPlus.x, pathPlus.y + 1, pathPlus];
    }

    return [pathMinus.x + 1, pathMinus.y, pathMinus];
  }

  function ondMain([d]) {
    const max = d <= m ? d : m - (d - m);
    const min = d <= n ? d : n - (d - n);
    const [maxInt, head] = recurse(([k]) => k <= max, ([k]) => {
      const i = n + 1 + k;
      const [x1, y1, parent] = ondInitXY(i);
      const [,, x, y] = snake([k, 0, x1, y1]);
      pathList[i] = {
        x,
        y,
        parent
      };

      if (m <= x && n <= y) {
        return [Number.MAX_SAFE_INTEGER, pathList[i]];
      }

      return [k + 2];
    })([-min]);

    if (head) {
      return [maxInt, head];
    }

    return [d + 1];
  }

  function ond() {
    const [, head] = recurse(([p]) => p <= m + n, ondMain)([0]);
    return head;
  }

  const head = onp(n); // console.log(JSON.stringify(head, null, 4)); // See all paths.

  return unifiedResult(source, head);
}

exports.diff = diff;