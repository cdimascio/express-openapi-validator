const openApiValidator = require('fastify-openapi-validator');
const { Pets } = require('./services');
const pets = new Pets();
// const fastifyCookie = require('fastify-cookie')

function plugin(instance, options, next) {
  instance.register(openApiValidator, {
    apiSpec: './openapi.yml',
    validateRequests: true, // (default)
    validateResponses: false, // false by default
  });

  instance.get('/v1/pets', (request, reply) => {
    return pets.findAll(request.query);
  });

  instance.get('/v1/pets/:id', (request, reply) => {
    const pet = pets.findById(request.params.id);
    if (!pet) reply.code(404).send({ msg: 'not found' });
    return pet;
  });

  next();
}

module.exports = plugin;
