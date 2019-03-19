const expect = require('chai').expect;
const { OpenApiMiddleware } = require('../');
const packageJson = require('../package.json');

describe(packageJson.name, () => {
  it('existing spec', async () => {
    const oam = new OpenApiMiddleware({
      apiSpecPath: './openapi.yaml',
      validate: true,
      enableObjectCoercion: true // should be default
    });

    expect(oam)
      .to.have.property('middleware')
      .that.is.a('function');
  });

  it('missing spec', async () => {
    const createMiddleware = () =>
      new OpenApiMiddleware({
        apiSpecPath: './not-found.yaml',
        validate: true,
        enableObjectCoercion: true // should be default
      }).middleware();

    expect(createMiddleware).to.throw(
      'spec could not be read at ./not-found.yaml'
    );
  });
});
