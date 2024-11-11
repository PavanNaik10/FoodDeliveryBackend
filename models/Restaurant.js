// models/Restaurant.js
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  location: { type: String, required: true },
  menus: [
    {
      itemName: { type: String, required: true },
      price: { type: Number, required: true },
      category: { type: String, required: true },
      image: { type: String, required: true },
      rating: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
