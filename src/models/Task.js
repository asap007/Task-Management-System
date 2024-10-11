const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    statusHistory: [{
        status: {
            type: String,
            enum: ['assigned', 'submitted', 'approved', 'in_progress', 'on_hold', 'rejected', 'completed']
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    status: { 
        type: String, 
        enum: ['assigned', 'submitted', 'approved', 'in_progress', 'on_hold', 'rejected', 'completed'], 
        default: 'assigned' 
    },
    driveLink: { type: String },
    submissionLink: { type: String },
    deadline: { type: Date, required: true },
    submittedAt: { type: Date },
    feedback: { type: String }
}, { timestamps: true });

// Add a pre-save middleware to automatically update statusHistory
TaskSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }
    next();
});

module.exports = mongoose.model('Task', TaskSchema);