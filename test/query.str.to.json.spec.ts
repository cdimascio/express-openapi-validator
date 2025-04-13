const { expect } = require('chai');

// The function to test
function parseQueryString(queryString) {
  // Remove leading ? if present
  if (queryString.startsWith('?')) {
    queryString = queryString.substring(1);
  }
  
  // Return empty object for empty strings
  if (!queryString) {
    return {};
  }
  
  const params = queryString.split('&');
  const result = {};
  
  params.forEach(param => {
    // Skip empty parameters
    if (!param) return;
    
    const [key, value] = param.split('=').map(part => decodeURIComponent(part || ''));
    
    // Match keys with square brackets pattern: something[property]
    const matches = key.match(/^([^\[]+)\[([^\]]+)\]$/);
    
    if (matches) {
      const mainKey = matches[1];
      const subKey = matches[2];
      
      // Create nested object if it doesn't exist
      if (!result[mainKey]) {
        result[mainKey] = {};
      }
      
      // Handle array values if needed
      if (value && value.includes(',')) {
        result[mainKey][subKey] = value.split(',');
      } else {
        result[mainKey][subKey] = value;
      }
    } else {
      // Handle regular key-value pairs
      result[key] = value;
    }
  });
  
  return result;
}

describe.only('Query String Parser', () => {
  describe('Basic functionality', () => {
    it('should handle empty strings', () => {
      expect(parseQueryString('')).to.deep.equal({});
      expect(parseQueryString('?')).to.deep.equal({});
    });
    
    it('should parse simple key-value pairs', () => {
      expect(parseQueryString('name=value')).to.deep.equal({ name: 'value' });
      expect(parseQueryString('a=1&b=2')).to.deep.equal({ a: '1', b: '2' });
    });
    
    it('should handle question mark prefix', () => {
      expect(parseQueryString('?name=value')).to.deep.equal({ name: 'value' });
    });
  });
  
  describe('Bracket notation', () => {
    it('should parse single bracket notation', () => {
      expect(parseQueryString('filter[name]=test')).to.deep.equal({ 
        filter: { name: 'test' } 
      });
    });
    
    it('should parse multiple bracket notations for the same key', () => {
      expect(parseQueryString('filter[name]=test&filter[age]=25')).to.deep.equal({ 
        filter: { name: 'test', age: '25' } 
      });
    });
    
    it('should handle multiple main keys with bracket notation', () => {
      expect(parseQueryString('filter[name]=test&sort[field]=created_at')).to.deep.equal({ 
        filter: { name: 'test' },
        sort: { field: 'created_at' }
      });
    });
  });
  
  describe('Array values', () => {
    it('should parse comma-separated values as arrays', () => {
      expect(parseQueryString('filter[colors]=red,green,blue')).to.deep.equal({ 
        filter: { colors: ['red', 'green', 'blue'] } 
      });
    });
    
    it('should handle mixed array and scalar values', () => {
      expect(parseQueryString('filter[colors]=red,green,blue&filter[name]=product')).to.deep.equal({ 
        filter: { 
          colors: ['red', 'green', 'blue'],
          name: 'product'
        } 
      });
    });
  });
  
  describe('Edge cases', () => {
    it('should handle URL encoded characters', () => {
      expect(parseQueryString('filter[name]=test%20product&filter[category]=books%20%26%20media')).to.deep.equal({ 
        filter: { 
          name: 'test product',
          category: 'books & media'
        } 
      });
    });
    
    it('should handle empty values', () => {
      expect(parseQueryString('filter[name]=&filter[category]=')).to.deep.equal({ 
        filter: { 
          name: '',
          category: ''
        } 
      });
    });
    
    it('should handle parameters without values', () => {
      expect(parseQueryString('filter[name]&filter[active]')).to.deep.equal({ 
        filter: { 
          name: '',
          active: ''
        } 
      });
    });
    
    it('should handle malformed input', () => {
      expect(parseQueryString('&&filter[name]=test&&')).to.deep.equal({ 
        filter: { name: 'test' } 
      });
    });
  });
  
  describe('Complex examples', () => {
    it('should parse a complex query string', () => {
      const complexQuery = '?filter[name]=Product%20Name&filter[categories]=electronics,gadgets&sort[field]=price&sort[direction]=desc&page=2&limit=20';
      
      expect(parseQueryString(complexQuery)).to.deep.equal({
        filter: {
          name: 'Product Name',
          categories: ['electronics', 'gadgets']
        },
        sort: {
          field: 'price',
          direction: 'desc'
        },
        page: '2',
        limit: '20'
      });
    });
  });
});