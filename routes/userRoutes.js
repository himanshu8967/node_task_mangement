const express = require("express");
const router = express.Router();
const User = require("./../models/user");
const { jwtAuthMiddleware, generateToken } = require("./../jwt");

// POST route to add a person
router.post("/signup", async (req, res) => {
    try {
        const data = req.body; // Assuming the request body contains the User data

        // Check if there is already an admin user
        const adminUser = await User.findOne({ role: "admin" });
        if (data.role === "admin" && adminUser) {
            return res.status(400).json({ error: "Admin user already exists" });
        }

        // Check if a user with the gmail id already exists
        const existingUser = await User.findOne({ gamil: data.gmail });
        if (existingUser) {
            return res
                .status(400)
                .json({ error: "User with the user id already exists" });
        }

        // Create a new User document using the Mongoose model
        const newUser = new User(data);

        // Save the new user to the database
        const response = await newUser.save();
        console.log("data saved");

        const payload = {
            id: response.id,
        };
        console.log(JSON.stringify(payload));
        const token = generateToken(payload);

        res.status(200).json({ response: response, token: token });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Login Route
router.post("/login", async (req, res) => {
    try {
        // Extract gmail and password from request body
        const { email, password } = req.body;

        // Check if gmail or password is missing
        if (!email || !password) {
            return res
                .status(400)
                .json({ error: "user id and password are required" });
        }

        // Find the user by gmail
        const user = await User.findOne({ email: email });

        // If user does not exist or password does not match, return error
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid user id or Password" });
        }

        // generate Token
        const payload = {
            id: user.id,
        };
        const token = generateToken(payload);

        // resturn token as response
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Profile route
router.get("/profile", jwtAuthMiddleware, async (req, res) => {
    try {
        const userData = req.user;
        const userId = userData.id;
        const user = await User.findById(userId);
        // If no user is found, return an error
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
