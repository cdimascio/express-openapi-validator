const {ObjectID} = require('mongodb');
const _ = require('lodash');

let data = [
  {
    id: new ObjectID(),
    name: 'sparky',
    type: 'dog',
    tags: ['sweet'],
    creationDate: new Date()
  },
  {
    id: new ObjectID(),
    name: 'buzz',
    type: 'cat',
    tags: ['purrfect'],
    creationDate: new Date()
  },
  {
    id: new ObjectID(),
    name: 'max',
    type: 'dog',
    tags: [],
    creationDate: new Date()
  },
];

module.exports.Pets = class {
  constructor() {

  }
  findAll({ type, limit }) {
    var result = data.filter(d => d.type === type).slice(0, limit);
    return result?_.merge([], result):result;
  }

  findById(id) {
    var result = data.filter(p => p.id.equals(id))[0];
    return result?_.merge({}, result):result;
  }

  create(pet) {
    const npet = { id: new ObjectID(), ...pet };
    data.push(npet);
    return _.merge({}, npet);
  }

  delete(id) {
    var result = data.filter(e => e.id !== id);
    return result?_.merge({}, result):result;
  }
};
