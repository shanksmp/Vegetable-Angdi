require("dotenv").config();
require("./db/conn.js");
const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const hbs = require("hbs");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const multer = require("multer");
const cookieParser = require("cookie-parser");

const Register = require("./models/registers.js");
const Product = require("./models/products.js");
const Order = require("./models/orders.js");
const OrderHsitory = require("./models/orderHistory.js");
const auth = require("./middleware/auth.js");
const resetAuth = require("./middleware/resetAuth.js");

const app = express();

const PORT = process.env.PORT || 3000 ;
const static_path = path.join(__dirname, "../public");
const templates_path = path.join(__dirname, "../templates", "views");
const partials_path = path.join(__dirname, "../templates", "partials");

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended:false}));
app.use(express.static(static_path));

app.set("view engine", "hbs");
app.set("views", templates_path);
hbs.registerPartials(partials_path);

const storage = require("./components/multer.js");
const upload = multer({storage});

app.get("/",(req, res)=>{
    console.log(req.user);
    const data={
        opt1:"bi bi-box-arrow-in-right",
        opt2:"Login /",
        opt3:"bi bi-door-open-fill",
        opt4:"Register",
        link:"/register",
    };
    res.render("index",data);
});


// /home page after login
app.get("/home", auth, async(req, res)=>{

    try{
        // data to be sent to the home page after login
        const data={
            opt1:"bi bi-box-arrow-in-right",
            opt2:"Logout",
            link:"/logout",
        };

        res.render("index", data);

    }catch(err){
        res.redirect("/");
    }

});
// /register page 
app.get("/register", (req, res)=>{

    res.render("registration");
});
//registration 
app.post("/register", async(req, res)=>{
    
    try {
        console.log("Inside");
        password = req.body.password;
        cpassword = req.body.cpassword;

        bankAcc= req.body.bankAcc;
        CbankAcc= req.body.CbankAcc;

        if(password === cpassword && bankAcc === CbankAcc ){
            
            const signup = new Register({
                name : req.body.name,
                email: req.body.email,
                password,
                state: req.body.state,
                bankAcc,
                address: req.body.address,
                role: req.body.role,
            });
    
            const token = await signup.generateAuthToken();
            console.log(signup._id);
            console.log(signup.password);

            // const resp = await signup.save();
            // console.log(resp);
            res.redirect("/register");

        }
        else{
            res.send("password dont match");
        }

    } catch(err){
        console.log(err);
        res.status(500).json({msg:"Registration failed"});
    }
});

app.post("/login", async(req, res)=>{

    try{

        const email = req.body.email;
        const password = req.body.password;

        const user = await Register.findOne({email});

        if(user == null){
            res.status(400).json({msg:"Email not registered"});
            return;
        }

        const match = await bcrypt.compare(password, user.password);

        if(match){

            const token = await user.generateAuthToken();

            res.cookie("jwt",token,{
                httpOnly:true
            });

            const data={
                opt1:"bi bi-box-arrow-in-right",
                opt2:"Logout",
                link:"/logout",
            };

            res.render("index", data);

        }
        else{
            res.status(400).json({msg:"Email or password is incorrect"});
            return;
        }

    }catch(err){

        console.log(err);
        res.status(500).json({msg:"Server Error"});
    }

});

app.get("/forget", (req, res)=>{

    res.render("forget");
});

app.post("/forget",async(req,res)=>{

    try{

        const email = req.body.email;

        const user = await Register.findOne({email});

        if(user == null){
            res.status(400).json({msg:"User not found"});
            return;
        }

        const token = await user.forgetAuthToken();
        res.clearCookie("jwt");
        const link = `http://localhost:${PORT}/reset-password/${user._id}/${token}`;
        
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            auth: {
              user: process.env.EMAIL_HOST,
              pass: process.env.EMAIL_PASS,
            },
        });
    
        const mailOptions = {
            from: '"Support" <supportcustomer@gmail.com>',
            to: email,
            subject: "Reset Password",
            text: `You have requested to reset your password. Click on the link to reset your password ${link}`,
        }
        
        const info = await transporter.sendMail(mailOptions);
        console.log(info);
        res.send("<h1>Check mail for the link to reset password...</h1>");

    }catch(err){

        console.log(err);
        res.status(500).json({msg:"Server Error"});

    }

});

app.get("/reset-password/:_id/:token",resetAuth,(req, res)=>{

    res.render("reset",{
        token:req.params.token,
        email: req.email
    });

});

app.post("/reset-password/:token", async(req ,res)=>{

    try{

        let {password, cpassword} = req.body;
        const token = req.params.token;

        
        if(password !== cpassword){
            res.status(400).json({msg:"Password dont match"});
            return;
        }
        password = await bcrypt.hash(password, 10);

        const secretKey = process.env.SECRET_KEY;
        const verifyUser = await jwt.verify(token, secretKey);


        const user = await Register.findByIdAndUpdate({_id: verifyUser._id},{$set:{password}});
        console.log(user);
        console.log("password: "+password);
        console.log("Password reset successfull");

        res.redirect("/register");
        
    }catch(err){
        console.log(err);
        res.status(500).json({msg: "Server Error"});
    }

});

app.get("/dashboard", auth, (req, res)=>{

    console.log(req.user.role);

    if(req.user.role == "buyer"){

        res.render("buyerDashboard");

    }
    else if(req.user.role == "seller"){

        res.render("adminDashboard");

    }
    else{
        res.sendStatus(500);
    }


});

app.get("/profile", auth, (req, res)=>{

    const profile = req.user;

    const name = profile.name;
    const email = profile.email;
    const state = profile.state;
    const address = profile.address;
    const bankAcc = profile.bankAcc;
    const role = profile.role;

    res.render("profile",{
        name,
        email,
        state,
        address,
        bankAcc,
        role,
    });
    
});



app.post("/addProducts", upload.single('image'), auth, async(req, res)=>{

    try{

        const items = new Product({

            name : req.body.name,
            owner : req.user._id,
            price : req.body.price,
            category : req.body.category,
            img : req.file.filename,

        });
        
        
        const resp = await items.save();
        res.redirect("/dashboard");

    }catch(err){

        console.log(err);
        res.status(500).json({msg: "Sorry we couldn't add your Product. Make sure to fill all the fields and try again.", state: false});
    };

});

app.get("/search/:word", async(req, res)=>{

    const search_name = req.params.word;

    const products = await Product.find({ name: { $regex: search_name } })
    ;
    console.log(products);
    res.json(products);

});


app.get("/listings", async(req, res)=>{

    try{

    const list = await Product.find({});
    console.log(list);

    res.json(list);

    }catch(err){

        console.log(err);
        res.sendStatus(500);
    }

});

app.get("/myListingsPage", auth, (req, res)=>{

    res.render("listingPage");

});

app.get("/myListings", auth, async(req, res)=>{

    try{

        const myList = await Product.find({owner:req.user._id},{_id:0, owner:0});
        console.log(myList);
        res.json(myList);
       

    }catch(err){

        console.log(err);
        res.sendStatus(500);

    }

});

app.post("/orders", auth, async(req, res)=>{

    try{

        const productId = req.body.id;
        const buyer = req.user;
    
        const product = await Product.findById({_id: productId});
        

        const ordersCart = new Order({

            productId,
            pName: product.name,
            buyerId: req.user._id,
            buyerName: req.user.name,
            ownerId: product.owner,
            price: product.price,
            category: product.category,
            img: product.img,

        });

        const resp = await ordersCart.save();
        console.log(resp);

    }catch(err){
        console.log(err);
        res.status(500).json({msg: "Sorry we couldn't add the requested product to your cart"});
    }

});

app.get("/cart", auth, (req, res)=>{
    res.render("cart");
})

app.get("/orders", auth, async(req, res)=>{

    try{

        const myOrders = await Order.find({buyerId: req.user._id});
        console.log(myOrders);    
        res.json(myOrders);

    }catch(err){
        console.log(err);
        res.sendStatus(500);
    }

});

app.get("/approval/:id", auth, async(req, res)=>{
    try{

        const orderId = req.params.id; 
        const order = await Order.findById({_id: orderId});

        const pName = order.pName;

        const buyerEmail = await Register.findById({_id: order.buyerId},{email:1, _id:0});
        console.log(buyerEmail);

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            auth: {
              user: process.env.EMAIL_HOST,
              pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: '"Smart Agriculture" <supportcustomer@gmail.com>',
            to: buyerEmail,
            subject: "Order Confirmed",
            text: `Your order for ${pName} has been confirmed. Your order id is ${orderId}. `,
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(info);

        await Order.findByIdAndDelete({_id: orderId});

        res.json({msg: "Approved"});

    }catch(err){
        console.log(err);
        res.sendStatus(err);
    }
});

app.get("/disapprove/:id", auth, async(req,res)=>{
    try{

        const orderId = req.params.id;
        const order = await Order.findById({_id: orderId});
        const pName = order.pName;

        const buyerEmail = await Register.findById({_id: order.buyerId},{email:1, _id:0});
        console.log(buyerEmail);

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            auth: {
              user: process.env.EMAIL_HOST,
              pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: '"Smart Agriculture" <supportcustomer@gmail.com>',
            to: buyerEmail,
            subject: "Order Rejected",
            text: `Your order for ${pName} has been Rejected. Send mail to ${process.env.EMAIL_HOST} for any querry `,
        }

        const info = await transporter.sendMail(mailOptions);
        console.log(info);

        await Order.findByIdAndDelete({_id: orderId});

        res.json({msg: "Rejected"});

    }catch(err){
        console.log(err);
        res.sendStatus(err);
    }
});

app.get("/logout", auth, async(req, res)=>{

    try{

        res.clearCookie("jwt");
        req.user.tokens = [];   

        await req.user.save();
        res.redirect("/register");

    }catch(err){
        console.log(err);
        res.sendStatus(500);

    }
});



app.get("*",(req, res)=>{
    res.render("404");
});


app.listen(PORT, (err)=>{
    if(err) throw err;
    console.log("The server is running on port: ",PORT);
});