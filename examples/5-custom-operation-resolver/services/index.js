let data = [
  {
    id: 1,
    name: 'sparky',
    type: 'dog',
    tags: ['sweet'],
  },
  {
    id: 2,
    name: 'buzz',
    type: 'cat',
    tags: ['purrfect'],
  },
  {
    id: 3,
    name: 'max',
    type: 'dog',
    tags: [],
  },
];

module.exports.Pets = class {
  constructor() {
    this.id = 4;
  }
  findAll({ type, limit }) {
    return data.filter(d => d.type === type).slice(0, limit);
  }

  findById(id) {
    return data.filter(p => p.id === id)[0];
  }

  create(pet) {
    const npet = { id: this.id++, ...pet };
    data.push(npet);
    return npet;
  }

  delete(id) {
    return data.filter(e => e.id !== id);
  }
}
