const express = require('express');
const Task = require('../models/Task');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');


const router = express.Router();

// Handle task status update
router.post('/tasks/complete', authMiddleware, async (req, res) => {
    const { token, taskId, status, driveLink } = req.body;

    console.log("Request Body:", req.body); // Log the entire request body
    console.log("Received taskId:", taskId); // Debugging line

    try {
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Valid Task ID is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'intern') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const task = await Task.findById(taskId);
        console.log(task);
        if (!task || task.assignedTo.toString() !== user._id.toString()) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Update task status and drive link
        task.status = status;

        if (status === 'submitted') {
            task.driveLink = driveLink;
        } else if (status === 'assigned' || status === 'on_hold' || status === 'in_progress') {
            task.driveLink = null; 
        }

        await task.save();
        res.redirect(`/account?token=${token}`);
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.post('/tasks/resubmit', authMiddleware, async (req, res) => {
    const { token, taskId, driveLink } = req.body;

    try {
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
            return res.status(400).json({ message: 'Valid Task ID is required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'intern') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const task = await Task.findById(taskId);
        if (!task || task.assignedTo.toString() !== user._id.toString()) {
            return res.status(404).json({ message: 'Task not found' });
        }

        // Update task status to 'submitted' and set drive link
        task.status = 'submitted';
        task.driveLink = driveLink;

        await task.save();
        res.redirect(`/account?token=${token}`);
    } catch (error) {
        console.error('Error resubmitting task:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// Handle task assignment
router.post('/tasks/assign', authMiddleware, async (req, res) => {
    const { title, description, assignedTo, token, deadline } = req.body;

    try {
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'senior') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const intern = await User.findById(assignedTo);
        if (!intern || intern.role !== 'intern') {
            return res.status(404).json({ message: 'Intern not found' });
        }

        const task = new Task({
            title,
            description,
            assignedTo: intern._id,
            assignedBy: user._id,
            deadline,
            status: 'assigned' // Default status when assigned
        });

        await task.save();
        res.redirect(`/interns?token=${token}`);
    } catch (error) {
        console.error('Error assigning task:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
