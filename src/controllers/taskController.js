const Task = require('../models/Task');
const User = require('../models/User');

// Assign a task to an intern
const assignTask = async (req, res) => {
    const { title, description, assignedTo } = req.body;

    try {
        const task = new Task({
            title,
            description,
            assignedTo,
        });

        await task.save();
        res.status(201).json({ message: 'Task assigned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// Get tasks assigned to a user
const getTasks = async (req, res) => {
    const userId = req.user.id;
    const role = req.user.role;

    try {
        const tasks = await getTasksForUser(userId, role);
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};


// Update task status and drive link
const updateTask = async () => {
    const response = await fetch('/api/tasks/complete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: yourToken, 
            taskId: yourTaskId, 
            status: yourStatus,
            driveLink: yourDriveLink
        })
    });

    const data = await response.json();
    console.log(data);
};



// Approve or reject a task
const reviewTask = async (req, res) => {
    const { taskId, approved } = req.body;

    try {
        const task = await Task.findById(taskId);

        if (!task || req.user.role !== 'senior') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        task.approved = approved;
        await task.save();
        res.json({ message: `Task ${approved ? 'approved' : 'rejected'} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    assignTask,
    getTasks,
    updateTask,
    reviewTask,
};
