/*
 * [js-md5]{@link https://github.com/emn178/js-md5}
 *
 * @version 0.7.3
 * @author Chen, Yi-Cyuan <emn178@gmail.com>
 * @copyright 2014-2018 Chen, Yi-Cyuan
 * @license MIT
 */
/*jslint bitwise: true */
const ARRAY_BUFFER = typeof ArrayBuffer !== 'undefined';
const HEX_CHARS = '0123456789abcdef'.split('');
const EXTRA = [128, 32768, 8388608, -2147483648];
const SHIFT = [0, 8, 16, 24];
const OUTPUT_TYPES = ['hex', 'array', 'digest', 'buffer', 'arrayBuffer', 'base64'];

const blocks = (
  (message: string | any[] | ArrayBuffer, isAA?: boolean) => {
    const { length } = message;
    let i = 0;
    const blocks: any = [];

    if (isAA) {
      for (; i < length; i += 2) {
        blocks[i >> 3] |= message[i] << SHIFT[(i % 4) * 2];
        blocks[i >> 3] |= message[i + 1] << SHIFT[((i % 4) * 2) + 1];
      }
    } else if (ARRAY_BUFFER && message instanceof ArrayBuffer) {
      const array = new Uint8Array(message);
      for (; i < length; ++i) {
        blocks[i >> 2] |= array[i] << SHIFT[i % 4];
      }
    } else {
      for (; i < length; ++i) {
        blocks[i >> 2] |= message.charCodeAt(i) << SHIFT[i % 4];
      }
    }

    return blocks;
  }
);

const md5 = (message: string | any[] | ArrayBuffer, options?: { asString?: boolean, asBytes?: boolean, encoding?: 'binary' | 'UTF-8' }) => {
  options = options || {};
  const asString = options.asString;
  const asBytes = options.asBytes;
  const encoding = options.encoding || 'UTF-8';

  if (asBytes) {
    return md5.digest(message);
  }

  const blocks$1 = blocks(message, encoding === 'binary');
  const h0 = [1732584193, -271733879, -1732584194, 271733878];

  const process = (h: number[], blocks: number[]) => {
    let a = h[0];
    let b = h[1];
    let c = h[2];
    let d = h[3];

    const T = [
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
      5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
      4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
      6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
    ];

    const K = [
      -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
      -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
      1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
      643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
      568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
      1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
      -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
      -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
      -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
      -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
      -145523070, -1120210379, 718787259, -343485551
    ];

    for (let i = 0; i < 64; ++i) {
      let F, g;
      if (i < 16) {
        F = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        F = (d & b) | (~d & c);
        g = (1 + 5 * i) % 16;
      } else if (i < 48) {
        F = b ^ c ^ d;
        g = (5 + 3 * i) % 16;
      } else {
        F = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      const temp = d;
      d = c;
      c = b;
      b = b + ((a + F + K[i] + blocks[g]) << T[i] | (a + F + K[i] + blocks[g]) >>> (32 - T[i]));
      a = temp;
    }

    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
  };

  const l = blocks$1.length * 4;
  blocks$1[l >> 2] |= EXTRA[l % 4];
  if (l % 4 === 3) {
    blocks$1.push(0);
  }
  blocks$1[(((l + 8) >> 6) + 1) * 16 - 2] = l * 8;
  process(h0, blocks$1);

  const result = [];
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      result.push((h0[i] >> (j * 8)) & 0xFF);
    }
  }

  if (asString) {
    return result.map(v => String.fromCharCode(v)).join('');
  }

  let hex = '';
  for (let i = 0; i < result.length; ++i) {
    hex += HEX_CHARS[(result[i] >> 4) & 0xF] + HEX_CHARS[result[i] & 0xF];
  }
  return hex;
};

md5.digest = (message: string | any[] | ArrayBuffer) => {
  const blocks$1 = blocks(message, true);
  const h0 = [1732584193, -271733879, -1732584194, 271733878];
  process(h0, blocks$1);
  const result = [];
  for (let i = 0; i < 4; ++i) {
    for (let j = 0; j < 4; ++j) {
      result.push((h0[i] >> (j * 8)) & 0xFF);
    }
  }
  return result;
};

export { md5 };
