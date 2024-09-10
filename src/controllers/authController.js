const User = require('../models/User');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    const { name, email, password, role, passkey } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate the passkey for both roles
        const validPasskey = process.env.REGISTER_PASSKEY; // Store the passkey securely in .env
        if (passkey !== validPasskey) {
            return res.status(403).json({ message: 'Invalid passkey' });
        }

        const user = await User.create({
            name,
            email,
            password,
            role
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        res.json({
            token,
            name: user.name,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};




const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        res.json({
            token,
            name: user.name,
            role: user.role // Optionally include the user role if needed
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = { registerUser, loginUser };
