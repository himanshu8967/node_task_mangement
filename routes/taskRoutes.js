const express = require("express");
const router = express.Router();
const Task = require("../models/task");
const { jwtAuthMiddleware } = require("../jwt");

// POST route to add a task
router.post("/", jwtAuthMiddleware, async (req, res) => {
    try {
        const data = req.body;

        if (!data || !data.title || !data.description || !data.dueDate) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Pass data directly to the Task constructor
        const newTask = new Task(data);

        const response = await newTask.save();
        console.log("Task created successfully");
        res.status(201).json(response);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// PUT route to update a task
router.put("/:taskID", jwtAuthMiddleware, async (req, res) => {
    try {
        const taskID = req.params.taskID;
        const updatedTaskData = req.body;

        const response = await Task.findByIdAndUpdate(taskID, updatedTaskData, {
            new: true, // Return the updated document
            runValidators: true, // Run Mongoose validation
        });

        if (!response) {
            return res.status(404).json({ error: "Task not found" });
        }

        console.log("Task updated successfully");
        res.status(200).json("data deleted sucessfully");
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// DELETE route to remove a task
router.delete("/delete/:taskID", jwtAuthMiddleware, async (req, res) => {
    try {
        const taskID = req.params.taskID;

        const response = await Task.findByIdAndDelete(taskID);

        if (!response) {
            return res.status(404).json({ error: "Task not found" });
        }

        console.log("Task deleted successfully");
        res.status(200).json({ task: response });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


// GET route to retrieve all tasks
router.get("/", jwtAuthMiddleware, async (req, res) => {
    try {
        const tasks = await Task.find(
            {},
            "title description dueDate status priority assignedUser"
        );

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
