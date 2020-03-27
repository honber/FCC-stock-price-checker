'use strict'

const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const stockSchema = new Schema({
  stock: String,
  likes: Array
})

const stockModel = mongoose.model('stock', stockSchema);

module.exports = stockModel;