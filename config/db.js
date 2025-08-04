const mongoose = require("mongoose")

function coonectToDB() {
    mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log("Connected to Database")
    }).catch(e=>{
        console.log("ERROR ",e);
        
    })    
}


module.exports = coonectToDB