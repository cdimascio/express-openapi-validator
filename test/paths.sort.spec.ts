import {
  sortRoutes,
} from '../src/framework/openapi.spec.loader';
import { expect } from 'chai';

describe('url sorter', () => {
  it('should sort dynamic leafs after static leafs', async () => {
    const urls = asRouteMetadatas(['/my/:id', '/my/path']);
    const expected = ['/my/path', '/my/:id'];

    urls.sort(sortRoutes);

    expect(urls[0].expressRoute).to.equal(expected[0]);
    expect(urls[1].expressRoute).to.equal(expected[1]);
  });

  it('should sort dynamic inner paths after static inner paths', async () => {
    const urls = asRouteMetadatas([
      '/my/:id/test',
      '/my/path/test',
      '/a/:b/c/:d',
      '/a/:b/c/d',
    ]);
    const expected = [
      '/a/:b/c/d',
      '/a/:b/c/:d',
      '/my/path/test',
      '/my/:id/test',
    ];

    urls.sort(sortRoutes);

    expect(urls[0].expressRoute).to.equal(expected[0]);
    expect(urls[1].expressRoute).to.equal(expected[1]);
    expect(urls[2].expressRoute).to.equal(expected[2]);
    expect(urls[3].expressRoute).to.equal(expected[3]);
  });
});

function asRouteMetadatas(urls: string[]) {
  return urls.map(u => ({
    expressRoute: u,
  }));
}
