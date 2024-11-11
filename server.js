const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // For authentication
const User = require('./models/User'); // Assuming you have created User model
const Restaurant = require('./models/Restaurant'); // Assuming Restaurant model exists
const bcrypt = require('bcrypt'); // Make sure to import bcrypt

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your_jwt_secret_key'; // Change to a more secure key for production

// Enable CORS with appropriate options
const allowedOrigins = [
  'http://192.168.0.109:8081', // Your React Native app's origin
  'http://localhost:8082', // Another origin you want to allow
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Check if the incoming origin is in the allowed origins array
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true); // Allow the request
      } else {
        callback(new Error('Not allowed by CORS')); // Reject the request
      }
    },
    methods: 'GET, POST, PUT, DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(bodyParser.json());

// MongoDB connection
mongoose.connect(
  'mongodb+srv://mudepavannaik123:1hGqq4mRAMSUIWBR@foodieapp.bkjqd.mongodb.net/Foodie',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on('error', (err) => console.error('MongoDB connection error:', err));
db.once('open', () => console.log('MongoDB connected'));

// User Routes

// Registration route (without password hashing)
app.post('/register', async (req, res) => {
  const { fullName, phoneNumber, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Create new user with plain text password
    user = new User({
      fullName,
      phoneNumber,
      email,
      password, // Plain text password stored directly
    });

    await user.save();
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login Email:', email);
  console.log('Login Password (Raw):', password);

  try {
    // Check if user exists
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'User Not Registered' });
    }

    // Compare plain text password with hashed password in the database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // Create and return JWT token
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({
      token,
      user: { id: user._id, email: user.email, fullName: user.fullName },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all restaurants
app.get('/restaurants', async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new product to a restaurant
app.post('/add-product', async (req, res) => {
  const {
    restaurant: restaurantName,
    itemName,
    price,
    category,
    subCategory,
    image,
    rating,
  } = req.body;

  try {
    // Find the restaurant by name
    const restaurant = await Restaurant.findOne({ name: restaurantName }); // Updated to findOne for name search
    if (!restaurant) {
      return res.status(404).json({ msg: 'Restaurant not found' });
    }

    // Add the new product to the restaurant's menu
    restaurant.menus.push({
      itemName,
      price,
      category,
      subCategory,
      image,
      rating,
    });

    // Save the updated restaurant document
    await restaurant.save();

    // Respond with the newly added product
    res.status(201).json({
      msg: 'Product added successfully',
      product: restaurant.menus[restaurant.menus.length - 1], // Get the last added menu item
    });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get products data
app.get('/products-data', async (req, res) => {
  try {
    const restaurantsData = await Restaurant.aggregate([
      {
        $unwind: '$menus', // Unwind the menus array
      },
      {
        $group: {
          _id: {
            restaurant: '$name', // Group by restaurant name and category
            category: '$menus.category',
            subCategory: '$menus.subCategory',
          },
        },
      },
      {
        $group: {
          _id: '$_id.restaurant',
          categories: {
            $addToSet: {
              category: '$_id.category',
              subCategories: '$_id.subCategory',
            },
          },
        },
      },
      {
        $project: {
          restaurantName: '$_id', // Rename _id to restaurantName
          categories: {
            $map: {
              input: { $setUnion: ['$categories'] }, // Unique categories
              as: 'category',
              in: {
                category: '$$category.category',
                subCategories: { $setUnion: ['$categories.subCategories'] }, // Unique subcategories
              },
            },
          },
        },
      },
    ]);

    // Log the structured data (optional)
    console.log(JSON.stringify(restaurantsData));

    // Send the structured data as a response
    res.send(restaurantsData);
  } catch (err) {
    console.error('Error fetching products data:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user data (Protected route)
app.get('/user', async (req, res) => {
  const token = req.header('Authorization').replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
});

// Search endpoint
app.get('/search', async (req, res) => {
  const { q, category, subCategory, minPrice, maxPrice, minRating } = req.query;

  try {
    const searchQuery = {};

    // Add item name search
    if (q) {
      const searchRegex = new RegExp(q, 'i'); // Case-insensitive search
      searchQuery['menus.itemName'] = searchRegex;
    }

    // Add category filter
    if (category) {
      searchQuery['menus.category'] = category;
    }

    // Add sub-category filter
    if (subCategory) {
      searchQuery['menus.subCategory'] = subCategory;
    }

    // Add price filter
    if (minPrice || maxPrice) {
      searchQuery['menus.price'] = {};
      if (minPrice) searchQuery['menus.price'].$gte = parseFloat(minPrice);
      if (maxPrice) searchQuery['menus.price'].$lte = parseFloat(maxPrice);
    }

    // Add rating filter
    if (minRating) {
      searchQuery['menus.rating'] = { $gte: parseFloat(minRating) };
    }

    // Perform the search using MongoDB aggregation
    const restaurants = await Restaurant.aggregate([
      { $match: searchQuery },
      { $unwind: '$menus' },
      {
        $match: {
          $and: [
            searchQuery, // Apply the search query for filtering
          ],
        },
      },
      {
        $project: {
          restaurantName: '$name',
          itemName: '$menus.itemName',
          price: '$menus.price',
          category: '$menus.category',
          image: '$menus.image',
          rating: '$menus.rating',
          subCategory: '$menus.subCategory',
        },
      },
    ]);

    if (restaurants.length === 0) {
      return res
        .status(404)
        .json({ msg: 'No items found for the search query' });
    }
    res.json(restaurants);
  } catch (err) {
    console.error('Error fetching search results:', err);
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
