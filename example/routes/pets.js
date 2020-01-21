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

  delete(id) {
    return data.filter(e => e.id !== id);
  }
}

const pets = new Pets();

module.exports = {
  'pets#list': (req, res) => {
    return res.json(pets.findAll(req.query));
  },
  'pets#create': (req, res) => {
    return res.json(pets.add({ ...req.body }));
  },
  'pets#pet': (req, res) => {
    const pet = pets.findById(req.params.id);
    return pet
      ? res.json(pet)
      : res.status(404).json({ message: 'not found' });
  },
  'pets#petPhotos': (req, res) => {
    // DO something with the file
    // files are found in req.files
    // non file multipar params are in req.body['my-param']
    console.log(req.files);

    return res.status(201).json({
      files_metadata: req.files.map(f => ({
        originalname: f.originalname,
        encoding: f.encoding,
        mimetype: f.mimetype,
        // Buffer of file conents
        // buffer: f.buffer,
      })),
    });
  },
  'pets#delete': (req, res) => {
    data = pets.delete(req.params.id);
    return res.status(204).end();
  }
};