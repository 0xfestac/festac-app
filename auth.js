const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send("No token provided");
  }

  // Check format properly
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Invalid token format");
  }

  const token = authHeader.slice(7).trim(); // safer than split

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("TOKEN ERROR:", err.message); // helps debugging
    res.status(401).send("Invalid token");
  }
};