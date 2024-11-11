const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Address Schema
const addressSchema = new mongoose.Schema(
  {
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    landmark: { type: String },
    addressType: { type: String, enum: ['Home', 'Work'], required: true },
  },
  { _id: false }
);

// Order Item Schema
const orderItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    description: { type: String },
  },
  { _id: false }
);

// Order History Schema
const orderHistorySchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, auto: true },
    restaurantName: { type: String, required: true },
    orderDateTime: { type: Date, required: true },
    orderStatus: {
      type: String,
      enum: ['placed', 'preparing', 'en route', 'delivered', 'cancelled'],
      required: true,
    },
    totalAmountPaid: { type: Number, required: true },
    itemsOrdered: [orderItemSchema],
    paymentMethodUsed: {
      type: String,
      enum: ['COD', 'Credit Card', 'UPI', 'PayPal'],
      required: true,
    },
  },
  { _id: false }
);

// Cart Item Schema
const cartItemSchema = new mongoose.Schema(
  {
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
  },
  { _id: false }
);

// Cart Schema
const cartSchema = new mongoose.Schema(
  {
    cartItems: [cartItemSchema],
    restaurant: { type: String, required: true },
    specialInstructions: { type: String },
    cartLastUpdated: { type: Date, default: Date.now },
    deliveryFee: { type: Number },
    taxesAndCharges: { type: Number },
  },
  { _id: false }
);

// User Schema
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    profilePicture: { type: String }, // Optional
    address: {
      home: addressSchema,
      work: addressSchema,
    },
    orderHistory: [orderHistorySchema],
    cart: cartSchema,
  },
  { timestamps: true }
);

// Encrypt password before saving user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
