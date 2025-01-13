import { findResponseContent } from '../src/middlewares/util';
import { expect } from 'chai';

describe('contentType', () => {
  it('should match wildcard type */*', async () => {
    const expectedTypes = ['application/json', 'application/xml'];
    const accepts = ['*/*'];

    const contentType = findResponseContent(accepts, expectedTypes);
    expect(contentType).to.equal(expectedTypes[0]);
  });

  it('should match wildcard type application/*', async () => {
    const expectedTypes = ['application/json', 'application/xml'];
    const accepts = ['application/*'];

    const contentType = findResponseContent(accepts, expectedTypes);
    expect(contentType).to.equal(expectedTypes[0]);
  });

  it('should null if no accept specified', async () => {
    const expectedTypes = ['application/json', 'application/xml'];
    const accepts = [];

    const contentType = findResponseContent(accepts, expectedTypes);
    expect(contentType).to.equal(null);
  });

  it('should match media type if charset is not specified in accepts', async () => {
    const expectedTypes = [
      'application/json; charset=utf-8',
      'application/xml',
    ];
    const accepts = ['application/json'];

    const contentType = findResponseContent(accepts, expectedTypes);
    expect(contentType).to.equal(expectedTypes[0]);
  });

  it('should match media type if charset is specified in accepts, but charset not defined in schema', async () => {
    const expectedTypes = [
      'application/json',
      'application/xml',
    ];
    const accepts = ['application/json; charset=utf-8'];

    const contentType = findResponseContent(accepts, expectedTypes);
    expect(contentType).to.equal(expectedTypes[0]);
  });
});
