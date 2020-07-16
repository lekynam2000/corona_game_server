const mongoose = require('mongoose');

const GameSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref:'users',
    required: true,
  },
  players:[{
    name:{
      type: String,
      required:true,
    },
    role:{
        type:String
    },
    infected:{
        type:Boolean,
        default:false
    },
    disabled:{
        type:Boolean,
        default:false
    },
    has_mask:{
        type:Boolean,
        default:false
    }

  }],
    turn:{
        type: Number,
        default: 0
    },
    phase:{
        type: String,
    },
});
module.exports = Game = mongoose.model('games', GameSchema);
