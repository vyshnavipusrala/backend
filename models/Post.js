const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const PostSchema = new Schema({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String },
  author:{type:Schema.Types.ObjectId, ref:'user'},
}, {
  timestamps: true,
});

const Post = model('Post', PostSchema);

module.exports = Post;
