module.exports = {
  info: (req, res) => res.status(200).send({ id: req.params.userID })
};
