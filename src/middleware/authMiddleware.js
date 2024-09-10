const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    const token = req.query.token || req.body.token; // Check token in query or body

    console.log('Token:', token); // Log the token

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id);
        if (!req.user) {
            return res.redirect('/login');
        }
        next();
    } catch (error) {
        console.error('Error in authMiddleware:', error);
        res.redirect('/login');
    }
};


module.exports = authMiddleware;
