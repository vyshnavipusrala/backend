const express = require('express');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const app = express();
const cors = require('cors');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const cookieparser = require("cookie-parser");
const multer = require('multer');
const path = require('path');
const Post = require('./models/Post');
require('dotenv').config();

const secret = process.env.JWT_SECRET || 'abcdefgh';
const port = process.env.PORT || 4000;

app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(cookieparser());

mongoose.connect('mongodb+srv://vyshnavi:vyshnavi%40123@blog.qgwqbwm.mongodb.net/blog?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to the database!");
}).catch((error) => {
    console.error("Database connection error:", error);
});

app.post('/register', async (req, res) => {
    const { Username, Password } = req.body;
    try {
        const hashedPassword = bcrypt.hashSync(Password, 10);
        const userDoc = await User.create({ Username, password: hashedPassword });
        res.json(userDoc);
    } catch (e) {
        console.error("Error during registration:", e);
        res.status(400).json({ error: e.message });
    }
});

app.post('/login', async (req, res) => {
    const { userName, password } = req.body;
    try {
        const userDoc = await User.findOne({ Username: userName });
        if (!userDoc) {
            return res.status(400).json('Wrong credentials');
        }
        const passok = bcrypt.compareSync(password, userDoc.password);
        if (passok) {
            jwt.sign({ userName, id: userDoc._id }, secret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token).json('ok');
            });
        } else {
            res.status(400).json('Wrong credentials');
        }
    } catch (e) {
        console.error("Error during login:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (!token) return res.status(401).json('No token provided');
    
    jwt.verify(token, secret, (err, info) => {
        if (err) {
            console.error("Error verifying token:", err);
            return res.status(401).json('Invalid token');
        }
        res.json(info);
    });
});

app.post('/logout', (req, res) => {
    res.cookie('token', '').json('ok');
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/post', upload.single('file'), (req, res) => {
    const { token } = req.cookies;
    if (!token) return res.status(401).json('No token provided');
    
    jwt.verify(token, secret, async (err, info) => {
        if (err) return res.status(401).json('Invalid token');
        
        const { title, summary, content } = req.body;
        const post = new Post({
            title,
            summary,
            content,
            image: req.file ? `/uploads/${req.file.filename}` : null,
            author: info.id,
        });
        try {
            const savedPost = await post.save();
            res.json(savedPost);
        } catch (error) {
            console.error("Error saving post:", error);
            res.status(400).json({ error: error.message });
        }
    });
});

app.get('/post', async (req, res) => {
    const { search } = req.query;
    let query = {};

    if (search) {
        query = {
            title: { $regex: search, $options: 'i' }
        };
    }

    try {
        const posts = await Post.find(query)
            .populate('author', ['Username'])
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(posts);
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(400).json({ error: error.message });
    }
});

app.get('/post/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const postDoc = await Post.findById(id).populate('author', ['Username']);
        res.json(postDoc);
    } catch (error) {
        console.error("Error fetching post by ID:", error);
        res.status(400).json({ error: error.message });
    }
});

app.put('/post/:id', upload.single('file'), (req, res) => {
    const { token } = req.cookies;
    if (!token) return res.status(401).json('No token provided');

    jwt.verify(token, secret, async (err, info) => {
        if (err) return res.status(401).json('Invalid token');
        
        const { id } = req.params;
        const { title, summary, content } = req.body;
        const postUpdate = { title, summary, content };
        
        if (req.file) {
            postUpdate.image = `/uploads/${req.file.filename}`;
        }
        try {
            const post = await Post.findById(id);
            if (!post) {
                return res.status(404).json('Post not found');
            }
            Object.assign(post, postUpdate);
            const updatedPost = await post.save();
            res.json(updatedPost);
        } catch (error) {
            console.error("Error updating post:", error);
            res.status(400).json({ error: error.message });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
