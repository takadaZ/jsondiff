'use strict';

const tap = f => a => { f(a); return a; };
const pipe = (fn, ...fns) => (arg) => fns.reduce((acc, fn2) => fn2(acc), fn(arg));
function recurse<T>(cbCondition: { (a: T): boolean }, cbRecurse: { (a: T): T }) {
  function run(arg: T): T {
    if (cbCondition(arg)) {
      return run(cbRecurse(arg));
    }
    return arg;
  }
  return run;
}
function linkedListToArray<T>(head: T, parentKey: string) {
  let next = Object.assign({}, head, { [parentKey]: head }) as T;
  return [...{
    *[Symbol.iterator]() {
      while (next = next[parentKey]) yield next;
    }
  }];
}

type Source = {
  a: string | string[],
  b: string | string[],
  m: number,
  n: number,
  flip: boolean
};

type KList = {
  "k": number,
  "fp": number
}[];

type Path = {
  x: number,
  y: number,
  parent?: Path
};

type Ses = {
  value: string,
  added: boolean,
  removed: boolean,
  common: boolean
};

function init({ a, b }: { a: string | string[], b: string | string[] }): Source {
  const [m, n] = [a.length, b.length];
  function orFlip({ a, b }): Source {
    if (m >= n) {
      return { "a": b, "b": a, "m": n, "n": m, "flip": true };
    }
    return { a, b, m, n, "flip": false };
  }
  if (typeof a === 'string' && typeof b === 'string') {
    return orFlip({ a, b });
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return orFlip({ a, b });
  }
  return orFlip({ a: String(a), b: String(b) });
};

function unifiedResult({ a, b, flip }: Source, head: Path) {
  function getUndiff(x, undiffs): [Ses?] {
    if (undiffs > 0) {
      return [{ "value": a.slice(x - undiffs, x) as string, "added": false, "removed": false, "common": true }];
    }
    return [];
  }
  function getDiff(diffs: number, { x, y }): [Ses?] {
    if (diffs > 0) {
      return [{ "value": a[x] as string, "added": flip, "removed": !flip, "common": false }];
    }
    if (diffs < 0) {
      return [{ "value": b[y] as string, "added": !flip, "removed": flip, "common": false }];
    }
    return [];
  }
  const pathList = linkedListToArray(head, 'parent');
  return pathList.reduceRight((acc: Ses[], { x, y, parent = { x: 0, y: 0 } }) => {
    const diffX = x - parent.x;
    const diffY = y - parent.y;
    const ses = [...getDiff(diffX - diffY, parent), ...getUndiff(x, Math.min(diffX, diffY))] as [Ses, Ses?];
    const last = acc[acc.length - 1];
    const next = ses[0];
    if (last && ((last.added && next.added) || (last.removed && next.removed))) {
      return [...acc.slice(0, -1), { "value": last.value + next.value, "added": last.added, "removed": last.removed }, ...ses.slice(1)] as Ses[];
    }
    return [...acc, ...ses] as Ses[];
  }, [] as Ses[]);
}

function onpPreSnake([k, p, pp]): [number, number, number, number] {
  const [y, dir] = p > pp ? [p, -1] : [pp, 1];
  return [k, dir, y - k, y];
}

function Snake({ a, b, m, n }: Source) {
  return ([k, dir, x1, y1]): [number, number, number, number] => {
    const [x, y] = recurse<[number, number]>(
        ([x, y]) => (x < m && y < n && a[x] === b[y]),
        ([x, y]) => [x + 1, y + 1]
      )([x1, y1]);
    return [k, dir, x, y];
  }
};

export function diff(a: string | string[], b: string | string[]) {
  const source = init({ a, b });
  const { m, n } = source;
  const offset = m + 1;
  const delta = n - m;
  const kListMax = m + n + 3;
  const snake = Snake(source);
  const pathList: Path[] = [];
  const kList: KList = new Array(kListMax).fill({ "k": - 1, "fp": - 1 });

  function getFP(k: number): [number, number, number] {
    return [k, kList[k - 1 + offset].fp + 1, kList[k + 1 + offset].fp];
  }

  function setPath([k, dir, x, y]) {
    kList[k + offset] = { "k": pathList.length, "fp": y };
    const parent = pathList[kList[k + dir + offset].k];
    pathList.push({ x, y, parent });
  }

  function onpMain([init, condition, addK]) {
    recurse(condition, pipe(getFP, onpPreSnake, snake, tap(setPath), ([k]) => k + addK))(init);
  }

  function onp(n: number): Path {
    recurse<number>(
      _ => kList[delta + offset].fp < n,
      p => {
        ([
          [- p      , k => k < delta  ,   1],
          [delta + p, k => k > delta  , - 1],
          [delta    , k => k === delta, - 1]
        ] as [number, { (args: number): boolean }, number][]).forEach(onpMain);
        return p + 1;
      }
    )(0);
    return pathList[kList[delta + offset].k];
  }

  function ondInitXY(i: number): [number, number, Path] {
    const [pathMinus, pathPlus] = [pathList[i - 1], pathList[i + 1]];
    if (!pathMinus && !pathPlus) {
      return [0, 0, { x: 0, y: 0 } as Path];
    }
    if (!pathMinus || (pathPlus && pathMinus.x < pathPlus.x)) {
      return [pathPlus.x, pathPlus.y + 1, pathPlus];
    }
    return [pathMinus.x + 1, pathMinus.y, pathMinus];
  }

  function ondMain([d]: [number, Path?]): [number, Path?] {
    const max = d <= m ? d : m - (d - m);
    const min = d <= n ? d : n - (d - n);
    const [maxInt, head] = recurse<[number, Path?]>(
      ([k]) => k <= max,
      ([k]) => {
        const i = n + 1 + k;
        const [x1, y1, parent] = ondInitXY(i);
        const [,, x, y] = snake([k, 0, x1, y1]);
        pathList[i] = ({ x, y, parent });
        if (m <= x && n <= y) {
          return [Number.MAX_SAFE_INTEGER, pathList[i]];
        }
        return [k + 2];
      }
    )([- min]);
    if (head) {
      return [maxInt, head];
    }
    return [d + 1];
  }

  function ond(): Path {
    const [, head] = recurse<[number, Path?]>(([p]) => p <= m + n, ondMain)([0]);
    return head as Path;
  }

  const head = onp(n);
  // console.log(JSON.stringify(head, null, 4)); // See all paths.
  return unifiedResult(source, head);
}
