const { Pets } = require('../services');
const pets = new Pets();

module.exports = {
  list: (req, res) => {
    res.json(pets.findAll(req.query));
  },
  create: (req, res) => {
    res.json(pets.create({ ...req.body }));
  },
  show: (req, res) => {
    const pet = pets.findById(req.params.id);
    pet ? res.json(pet) : res.status(404).json({ message: 'not found' });
  },
  destroy: (req, res) => {
    data = pets.delete(req.params.id);
    res.status(204).end();
  },
  photos: (req, res) => {
    // DO something with the file
    // files are found in req.files
    // non file multipar params are in req.body['my-param']
    console.log(req.files);

    res.status(201).json({
      files_metadata: req.files.map(f => ({
        originalname: f.originalname,
        encoding: f.encoding,
        mimetype: f.mimetype,
        // Buffer of file conents
        // buffer: f.buffer,
      })),
    });
  },
};
