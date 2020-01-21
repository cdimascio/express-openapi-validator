const get = (req, res) => {
  res.status(200).send('pong');
};

module.exports = {
  'ping#get': get,
};