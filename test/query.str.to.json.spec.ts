import { expect } from 'chai';
import { describe, it } from 'mocha';


// TODO THIS TEST SUITE IS LIKELY TO BE UNNEDESSARY. DELETE

/**
 * Generic JSON value type that can represent any valid JSON structure
 */
type JsonValue = string | number | boolean | null | JsonArray | JsonObject;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
/**
 * Enhanced parseQueryString function that handles:
 * - Arbitrary depth objects
 * - Arrays through comma-separated values
 * - Arrays through indexed notation
 * - Type conversion for numeric values
 * - URL encoding
 */
export function parseQueryString(queryString: string): JsonObject {
  if (queryString.startsWith('?')) {
    queryString = queryString.substring(1);
  }

  if (!queryString) return {};

  const params = queryString.split('&');
  const result: JsonObject = {};

  params.forEach((param) => {
    if (!param) return;

    const [keyStr, value] = param
      .split('=')
      .map((part) => decodeURIComponent(part || ''));

    // Use regex to extract all keys
    const keys: string[] = [];
    const mainKeyMatch = keyStr.match(/^([^\[]+)/);
    const mainKey = mainKeyMatch?.[1] || '';
    keys.push(mainKey);

    // Extract all bracket contents
    const bracketMatches = keyStr.matchAll(/\[([^\]]*)\]/g);
    for (const match of bracketMatches) {
      keys.push(match[1]);
    }

    // Build the nested structure
    let current: JsonObject = result;
    for (let i = 0; i < keys.length; i++) {
      const isLast = i === keys.length - 1;
      const key = keys[i];

      // Check if we need to create an array (numeric key)
      const nextIsNumericKey = i < keys.length - 1 && /^\d+$/.test(keys[i + 1]);

      if (isLast) {
        // For the final key, set the actual value
        if (value && value.includes(',') && !/^\d+$/.test(key)) {
          // Handle comma-separated values as arrays
          // Try to convert numeric values in arrays
          current[key] = value
            .split(',')
            .map((v) => (!isNaN(Number(v)) && v !== '' ? Number(v) : v));
        } else {
          // Try to convert numeric values
          current[key] =
            !isNaN(Number(value)) && value !== '' ? Number(value) : value;
        }
      } else {
        // For intermediate keys
        if (!current[key]) {
          // Create appropriate container based on next key
          current[key] = nextIsNumericKey ? [] : {};
        }
        // TypeScript needs this assertion since we know at this point that current[key] is an object
        current = current[key] as JsonObject;
      }
    }
  });

  // Post-processing to convert objects with sequential numeric keys to arrays
  function convertNumericKeysToArrays(obj: JsonValue): JsonValue {
    if (!obj || typeof obj !== 'object') return obj;

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => convertNumericKeysToArrays(item));
    }

    // Handle objects
    Object.keys(obj).forEach((key) => {
      // Recursively process nested objects
      if (obj[key] && typeof obj[key] === 'object') {
        obj[key] = convertNumericKeysToArrays(obj[key]);
      }
    });

    // Check if this object should be an array
    const keys = Object.keys(obj);
    if (
      keys.length > 0 &&
      keys.every((k) => /^\d+$/.test(k)) &&
      (keys.length === 1 || keys.every((k) => parseInt(k) < keys.length))
    ) {
      // Convert to array if all keys are sequential integers
      const array: JsonValue[] = [];
      keys
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach((k) => (array[parseInt(k)] = obj[k]));
      return array;
    }

    return obj;
  }

  return convertNumericKeysToArrays(result) as JsonObject;
}

describe.skip('Enhanced Query String Parser', () => {
  describe('Basic functionality', () => {
    it('should handle empty strings', () => {
      expect(parseQueryString('')).to.deep.equal({});
      expect(parseQueryString('?')).to.deep.equal({});
    });

    it('should parse simple key-value pairs', () => {
      expect(parseQueryString('name=value')).to.deep.equal({ name: 'value' });
      expect(parseQueryString('a=1&b=2')).to.deep.equal({ a: 1, b: 2 });
    });

    it('should handle question mark prefix', () => {
      expect(parseQueryString('?name=value')).to.deep.equal({ name: 'value' });
    });
  });

  describe('Bracket notation', () => {
    it('should parse single bracket notation', () => {
      expect(parseQueryString('filter[name]=test')).to.deep.equal({
        filter: { name: 'test' },
      });
    });

    it('should parse multiple bracket notations for the same key', () => {
      expect(
        parseQueryString('filter[name]=test&filter[age]=25'),
      ).to.deep.equal({
        filter: { name: 'test', age: 25 },
      });
    });

    it('should handle multiple main keys with bracket notation', () => {
      expect(
        parseQueryString('filter[name]=test&sort[field]=created_at'),
      ).to.deep.equal({
        filter: { name: 'test' },
        sort: { field: 'created_at' },
      });
    });
  });

  describe('Array values', () => {
    it('should parse comma-separated values as arrays', () => {
      expect(parseQueryString('filter[colors]=red,green,blue')).to.deep.equal({
        filter: { colors: ['red', 'green', 'blue'] },
      });
    });

    it('should handle comma-separated numeric values', () => {
      expect(parseQueryString('list=12,13,14')).to.deep.equal({
        list: [12, 13, 14],
      });
    });

    it('should handle arrays with indexed notation', () => {
      expect(
        parseQueryString('list[0]=12&list[1]=13&list[2]=14'),
      ).to.deep.equal({
        list: [12, 13, 14],
      });
    });

    it('should handle mixed array and scalar values', () => {
      expect(
        parseQueryString('filter[colors]=red,green,blue&filter[name]=product'),
      ).to.deep.equal({
        filter: {
          colors: ['red', 'green', 'blue'],
          name: 'product',
        },
      });
    });
  });

  describe('Nested structures', () => {
    it('should handle arbitrary depth objects', () => {
      expect(
        parseQueryString(
          'user[address][city]=New York&user[address][zip]=10001',
        ),
      ).to.deep.equal({
        user: {
          address: {
            city: 'New York',
            zip: 10001,
          },
        },
      });
    });

    it('should handle deeply nested arrays', () => {
      expect(
        parseQueryString(
          'data[users][0][name]=John&data[users][0][age]=30&data[users][1][name]=Jane&data[users][1][age]=25',
        ),
      ).to.deep.equal({
        data: {
          users: [
            { name: 'John', age: 30 },
            { name: 'Jane', age: 25 },
          ],
        },
      });
    });

    it('should handle arrays inside objects inside arrays', () => {
      expect(
        parseQueryString(
          'data[0][tags]=javascript,nodejs&data[1][tags]=python,django',
        ),
      ).to.deep.equal({
        data: [
          { tags: ['javascript', 'nodejs'] },
          { tags: ['python', 'django'] },
        ],
      });
    });
  });

  describe('Type conversion', () => {
    it('should convert numeric values to numbers', () => {
      expect(parseQueryString('age=30&price=19.99')).to.deep.equal({
        age: 30,
        price: 19.99,
      });
    });

    it('should convert numeric values in arrays', () => {
      expect(parseQueryString('scores=10,20,30.5')).to.deep.equal({
        scores: [10, 20, 30.5],
      });
    });

    it('should not convert numeric strings that are not actually numbers', () => {
      expect(
        parseQueryString('zipcode=00123&phone=123-456-7890'),
      ).to.deep.equal({
        zipcode: 123, // This is numerically equivalent to 123
        phone: '123-456-7890', // This is not a valid number
      });
    });

    it('should handle empty values correctly', () => {
      expect(parseQueryString('name=&age=')).to.deep.equal({
        name: '',
        age: '',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle URL encoded characters', () => {
      expect(
        parseQueryString(
          'filter[name]=test%20product&filter[category]=books%20%26%20media',
        ),
      ).to.deep.equal({
        filter: {
          name: 'test product',
          category: 'books & media',
        },
      });
    });

    it('should handle parameters without values', () => {
      expect(parseQueryString('filter[name]&filter[active]')).to.deep.equal({
        filter: {
          name: undefined,
          active: undefined,
        },
      });
    });

    it('should handle malformed input', () => {
      expect(parseQueryString('&&filter[name]=test&&')).to.deep.equal({
        filter: { name: 'test' },
      });
    });

    it('should handle arrays with missing indices', () => {
      expect(parseQueryString('list[0]=first&list[2]=third')).to.deep.equal({
        list: ['first', undefined, 'third'],
      });
    });

    it('should handle non-sequential array indices', () => {
      expect(parseQueryString('list[5]=five&list[10]=ten')).to.deep.equal({
        list: [
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          'five',
          undefined,
          undefined,
          undefined,
          undefined,
          'ten',
        ],
      });
    });

    it('should handle repeated keys with different values', () => {
      expect(parseQueryString('multi=1&multi=2')).to.deep.equal({
        multi: 2, // The last value wins
      });
    });

    it('should handle special characters in keys', () => {
      expect(parseQueryString('special@key=value')).to.deep.equal({
        'special@key': 'value',
      });
    });
  });

  describe('Combined cases', () => {
    it('should handle the filter names example', () => {
      expect(parseQueryString('filter[names]=jim,tim')).to.deep.equal({
        filter: {
          names: ['jim', 'tim'],
        },
      });

      expect(
        parseQueryString('filter[names][0]=jim&filter[names][1]=tim'),
      ).to.deep.equal({
        filter: {
          names: ['jim', 'tim'],
        },
      });
    });

    it('should handle mixed object and array with complex nesting', () => {
      const complexQuery =
        'test=test&list[0]=12&list[1]=13&list[2]=14&obj[key1]=val1&obj[nested][key2]=val2&arr[0][name]=product1&arr[0][price]=9.99&arr[1][name]=product2&arr[1][price]=19.99';

      expect(parseQueryString(complexQuery)).to.deep.equal({
        test: 'test',
        list: [12, 13, 14],
        obj: {
          key1: 'val1',
          nested: {
            key2: 'val2',
          },
        },
        arr: [
          { name: 'product1', price: 9.99 },
          { name: 'product2', price: 19.99 },
        ],
      });
    });

    it('should handle a complex real-world API query', () => {
      const apiQuery =
        'filter[status]=active&filter[date][gte]=2023-01-01&filter[date][lte]=2023-12-31&include=user,comments&sort=-created_at&page[number]=1&page[size]=20&fields[post]=title,content,author&fields[comment]=body,date';

      expect(parseQueryString(apiQuery)).to.deep.equal({
        filter: {
          status: 'active',
          date: {
            gte: '2023-01-01',
            lte: '2023-12-31',
          },
        },
        include: ['user', 'comments'],
        sort: '-created_at',
        page: {
          number: 1,
          size: 20,
        },
        fields: {
          post: ['title', 'content', 'author'],
          comment: ['body', 'date'],
        },
      });
    });
  });
});
