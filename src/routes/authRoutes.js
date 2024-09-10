const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Task = require('../models/Task');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Render registration page
router.get('/register', (req, res) => {
    res.render('register');
});

router.get('/', (req, res) => {
    res.redirect('register');
});

// Render login page
router.get('/login', (req, res) => {
    res.render('login');
});

// Handle registration form submission
router.post('/register', registerUser);

// Handle login form submission
router.post('/login', async (req, res) => {
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
});


// Render account page
router.get('/account', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'senior') {
            // Fetch interns and their task counts
            const interns = await User.find({ role: 'intern' });
            const internData = await Promise.all(interns.map(async (intern) => {
                const completedTasks = await Task.countDocuments({ assignedTo: intern._id, status: { $in: ['submitted', 'approved'] }});
                const pendingTasks = await Task.countDocuments({ 
                    assignedTo: intern._id, 
                    status: { $in: ['assigned', 'in_progress', 'on_hold', 'rejected'] } 
                });

                return {
                    name: intern.name,
                    completedTasks,
                    pendingTasks,
                };
            }));

            // Fetch upcoming deadlines
            const tasks = await Task.find({
                assignedBy: req.user._id,
                status: { $nin: ['approved', 'submitted'] }
            }).populate('assignedTo', 'name');

            res.render('seniorAccount', { 
                name: req.user.name, 
                interns: internData, 
                token: req.query.token,
                tasks // Include tasks in the data passed to the template
            });
        } else if (req.user.role === 'intern') {
            const tasks = await Task.find({ assignedTo: req.user._id }).populate('assignedBy', 'name');
            const taskData = tasks.map(task => ({
                _id: task._id, // Ensure _id is included
                title: task.title,
                description: task.description,
                assignedBy: task.assignedBy.name,
                status: task.status,
                deadline: task.deadline,
                feedback: task.feedback,
                driveLink: task.driveLink,
                createdAt: task.createdAt,
            }));
            
            res.render('internAccount', { name: req.user.name, tasks: taskData, token: req.query.token });
        } else {
            res.status(403).json({ message: 'Forbidden' });
        }
    } catch (error) {
        console.error('Error in /account route:', error);
        res.status(500).json({ message: 'Server error' });
    }
});





// Handle logout
router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/login');
});

// Render interns list for seniors
router.get('/interns', authMiddleware, async (req, res) => {
    try {
        const token = req.query.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'senior') {
            return res.redirect('/login');
        }

        // Fetch all interns
        const interns = await User.find({ role: 'intern' });

        // Fetch recent tasks (e.g., last 3 tasks)
        const recentTasks = await Task.find()
            .sort({ createdAt: -1 })
            .limit(3)
            .populate('assignedTo', 'name')
            .exec();

        // Fetch task count for tasks that are not marked as "submitted" or "approved"
        const taskDistribution = await Task.aggregate([
            { $match: { status: { $nin: ['submitted', 'approved'] } } }, // Exclude submitted or approved tasks
            { $group: { _id: "$assignedTo", taskCount: { $sum: 1 } } }
        ]);

        // Populate intern names in the task distribution data
        const populatedTaskDistribution = await User.populate(taskDistribution, { path: '_id', select: 'name' });

        // Prepare data for the chart (intern names and task counts)
        const internNames = populatedTaskDistribution.map(entry => entry._id.name);
        const taskCounts = populatedTaskDistribution.map(entry => entry.taskCount);

        // Render the intern list page, passing the necessary data
        res.render('internList', { 
            interns, 
            recentTasks, 
            token: req.query.token, 
            name: req.user.name,
            internNames, // Pass intern names for the chart
            taskCounts  // Pass task counts for the chart
        });
    } catch (error) {
        console.error('Error fetching interns or tasks:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// GET route for approval page
router.get('/approve', authMiddleware, async (req, res) => {
    try {
        const token = req.query.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'senior') {
            return res.redirect('/login');
        }

        // Fetch tasks submitted for approval
        const tasksForApproval = await Task.find({ status: 'submitted' }).populate('assignedTo', 'name').exec();

        res.render('approveTasks', { 
            tasksForApproval, 
            token, 
            name: req.user.name 
        });
    } catch (error) {
        console.error('Error fetching tasks for approval:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST route to handle approval/rejection
router.post('/approve/:taskId', authMiddleware, async (req, res) => {
    try {
        const token = req.body.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== 'senior') {
            return res.redirect('/login');
        }

        const { status, feedback } = req.body;
        const taskId = req.params.taskId;

        // Update task status and feedback
        const task = await Task.findByIdAndUpdate(taskId, { 
            status, 
            feedback 
        }, { new: true });

        res.redirect(`/approve?token=${token}`);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
