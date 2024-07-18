const mongoose=require('mongoose')

const UserSchema= new mongoose.Schema({
    Username:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    }
});

const UserModel=mongoose.model("user",UserSchema)
module.exports=UserModel