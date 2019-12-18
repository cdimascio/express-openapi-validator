const data = [
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

class Pets {
  constructor() {
    this.id = 4;
  }
  findAll({ type, limit }) {
    return data.filter(d => d.type === type).slice(0, limit);
  }

  findById(id) {
    return data.filter(p => p.id === id)[0];
  }

  add(pet) {
    const npet = { id: this.id++, ...pet};
    data.push(npet);
    return npet;
  }
}

exports.pets = new Pets();
