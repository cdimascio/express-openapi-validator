exports.default = {
  'test#get': (req, res) => {
    res.status(200).json({ message: 'It Works!' });
  },
};
