const express = require("express");
const router = express.Router();
const Task = require("../models/task");


const { jwtAuthMiddleware } = require("../jwt");

// POST route to add a task
router.post("/", jwtAuthMiddleware, async (req, res) => {
    try {
        const currentUser = req.user; // Get the current user from the middleware
        const { title, description, dueDate, priority, assignedUserId } = req.body;

        // If the role is admin, allow them to assign tasks to any user
        if (currentUser.role === 'admin') {
            // Ensure required fields are provided
            if (!title || !description || !dueDate || !priority || !assignedUserId) {
                return res.status(400).json({ message: "All fields (title, description, dueDate, priority, assignedUserId) are required for task assignment." });
            }

            // Check if the assigned user exists in the database
            const assignedUser = await User.findById(assignedUserId);
            if (!assignedUser) {
                return res.status(404).json({ message: "Assigned user not found." });
            }

            // Admin can assign a task to a specific user
            const newTask = new Task({
                title,
                description,
                dueDate,
                priority,
                assignedUser: assignedUserId,  // Assign task to a specific user
                status: 'pending'  // Default status for newly created tasks
            });

            const response = await newTask.save();
            console.log("Task assigned successfully by admin");
            return res.status(201).json({
                message: "Task assigned successfully",
                task: response,
                assignedTo: assignedUser.name  // For clarity, send the assigned user's name in response
            });

        } else if (currentUser.role === 'user') {
            // If the role is user, allow task creation for themselves
            if (!title || !description || !dueDate || !priority) {
                return res.status(400).json({ message: "All fields (title, description, dueDate, priority) are required for task creation." });
            }

            // User creates a task for themselves
            const newTask = new Task({
                title,
                description,
                dueDate,
                priority,
                assignedUser: currentUser._id,  // Task is assigned to the current user
                status: 'pending'
            });

            const response = await newTask.save();
            console.log("Task created successfully by user");
            return res.status(201).json(response);
        }

        // If the role is neither admin nor user, return unauthorized response
        return res.status(403).json({ message: "Unauthorized role" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// PUT route to update a task
router.put("/update/:taskID", jwtAuthMiddleware, async (req, res) => {
    try {
        const taskID = req.params.taskID;
        const updatedTaskData = req.body;

        // Find the task by its ID
        const task = await Task.findById(taskID);

        // If the task is not found, return 404
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Check if the user is an admin or the assigned user
        if (req.user.role === 'admin') {
            // Admin can only update tasks they have created (assigned)
            if (task.assignedBy.toString() === req.user._id.toString()) {
                // Update the task
                const updatedTask = await Task.findByIdAndUpdate(taskID, updatedTaskData, {
                    new: true,  // Return the updated document
                    runValidators: true,  // Run mongoose validators
                });

                console.log("Task updated by admin");
                return res.status(200).json({ message: "Task updated successfully by admin", task: updatedTask });
            } else {
                return res.status(403).json({ error: "Admin can only update tasks they have assigned" });
            }
        }

        if (req.user.role === 'user') {
            // Regular user can only update their own tasks or tasks assigned to them by admin
            if (
                task.assignedUser.toString() === req.user._id.toString() ||
                task.assignedBy.toString() === req.user._id.toString()
            ) {
                // Update the task
                const updatedTask = await Task.findByIdAndUpdate(taskID, updatedTaskData, {
                    new: true,  // Return the updated document
                    runValidators: true,  // Run mongoose validators
                });

                console.log("Task updated by the assigned user");
                return res.status(200).json({ message: "Task updated successfully by the user", task: updatedTask });
            } else {
                // User tries to update a task not assigned to them
                return res.status(403).json({ error: "You are not authorized to update this task" });
            }
        }

        // If the user's role is neither admin nor user, return an error
        return res.status(403).json({ error: "Unauthorized role" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



// DELETE route to remove a task
router.delete("/delete/:taskID", jwtAuthMiddleware, async (req, res) => {
    try {
        const taskID = req.params.taskID;

        // Find the task by its ID
        const task = await Task.findById(taskID);

        // If the task is not found, return 404
        if (!task) {
            return res.status(404).json({ error: "Task not found" });
        }

        // Check if the user is an admin or the assigned user
        if (req.user.role === 'admin') {
            // Admin can delete any task
            await Task.findByIdAndDelete(taskID);
            console.log("Task deleted by admin");
            return res.status(200).json({ message: "Task deleted successfully by admin" });
        } else if (req.user.role === 'user') {
            // Regular user can only delete their own tasks
            if (task.createdby.toString() === req.user._id.toString()) {
                await Task.findByIdAndDelete(taskID);
                console.log("Task deleted by the assigned user");
                return res.status(200).json({ message: "Task deleted successfully by the assigned user" });
            } else {
                // User tries to delete a task that they do not own
                return res.status(403).json({ error: "You are not authorized to delete this task" });
            }
        }

        // If the user role is neither 'admin' nor 'user', return a 403 Forbidden error
        return res.status(403).json({ error: "Unauthorized role" });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});




// GET route to retrieve all tasks
router.get("/getalltask", jwtAuthMiddleware, async (req, res) => {
    try {
        const currentUser = req.user;
        let tasks;

        // If the current user is an admin, fetch all tasks
        if (currentUser.role === "admin") {
            tasks = await Task.find({}, "title description dueDate status priority assignedUser");
        } else if (currentUser.role === "user") {
            // If the user is a regular user, fetch tasks they created or tasks assigned to them
            tasks = await Task.find({
                $or: [
                    { assignedUser: currentUser._id },   // Tasks assigned to the user
                    { createdBy: currentUser._id }       // Tasks created by the user (assuming you have a createdBy field)
                ]
            }, "title description dueDate status priority assignedUser");
        } else {
            // Return 403 if the user's role is neither admin nor user
            return res.status(403).json({ error: "Unauthorized role" });
        }

        // Respond with the retrieved tasks
        res.status(200).json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




// New GET route to search and filter tasks
router.get("/search", jwtAuthMiddleware, async (req, res) => {
    try {
        const { status, priority, assignedUser } = req.query;
        const query = {};

        if (status) query.status = status;
        if (priority) query.priority = priority;
        if (assignedUser) query.assignedUser = assignedUser;

        const tasks = await Task.find(query, "title description dueDate status priority assignedUser");

        res.status(200).json({ tasks });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});




module.exports = router;
