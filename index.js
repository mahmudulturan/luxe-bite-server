const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors({
  origin: [
    'https://luxe-bite.web.app',
    'https://luxe-bite.firebaseapp.com',
    // 'http://localhost:5173',
  ],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())


//custom middlewares
const verifyToken = async (req, res, next) => {

  const token = req.cookies?.token
  if (!token) {
    return res.status(401).send({ message: "Unauthorized Access" })
  }
  jwt.verify(token, process.env.SECRET_KEY, (err, decode) => {
    if (err) {
      return res.status(402).send({ message: "Unauthorized Access" })
    }
    req.user = decode;
    next()
  })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hzybyvu.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const foodsCollection = client.db('luxeBiteDB').collection('allFoodItems');
    const testimonialsCollection = client.db('luxeBiteDB').collection('testimonial');
    const chefCollection = client.db('luxeBiteDB').collection('chef');
    const ordersCollection = client.db('luxeBiteDB').collection('orders');
    const usersCollection = client.db('luxeBiteDB').collection('users');
    const blogsCollection = client.db('luxeBiteDB').collection('blogs');


    //jwt related api


    //endpoint to create user data
    app.post('/users', async(req, res) => {
      const userData = req.body;
      const result = await usersCollection.insertOne(userData);
      res.send(result)
    })

    //endpoint to genarate an token and set on cookies
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const email = user.userEmail;
      const filter = { email: email }
      const updatedData = {
        $set: {
          lastLogin: user.lastLogin,
          lastLogout: user.lastLogout
        }
      }
      const result = await usersCollection.updateOne(filter, updatedData)
      const token = jwt.sign({email}, process.env.SECRET_KEY, { expiresIn: '1h' })
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      }).send({ message: "success", result })
    })

     //endpoint to clear token from cookies
    app.post('/delete-cookie', async(req, res) => {
      const user = req.body;
      const filter = { email: user.userEmail }
      const updatedData = {
        $set: {
          lastLogin: user.lastLogin,
          lastLogout: user.lastLogout
        }
      }
      const result = await usersCollection.updateOne(filter, updatedData)
      res.clearCookie('token', {maxAge: 0}).send({message:'success', result})
    })






    //data related api

    //endpoint to get all food items
    app.get('/all-food-items', async (req, res) => {
      const searchKey = req.query.search;
      const limit = Number(req.query.limit);
      const skip = req.query.page * limit;
      let query = {};
      if (searchKey) {
        query = { food_name: { $regex: new RegExp(searchKey, 'i') } }
      }
      const result = await foodsCollection.find(query).skip(skip).limit(limit).toArray();
      const count = await foodsCollection.estimatedDocumentCount();
      res.send({ result, count });
    })

    //endpoint to get single food items by id
    app.get('/all-food-items/:id', async (req, res) => {
      const id = req.params.id;
      const cursor = { _id: new ObjectId(id) };
      const result = await foodsCollection.findOne(cursor);
      res.send(result);
    })

    //endpoint to get my added food items
    app.get('/my-added-items', verifyToken, async (req, res) => {
      const email = req.query?.email;
      if(email !== req.user.email){
       return res.status(403).send({ message: "Unauthorized Access" })
      }
      let query = {}
      if (email) {
        query = { 'made_by.email': email };
      }
      const result = await foodsCollection.find(query).toArray()
      res.send(result)
    })

    //endpoint to get my orderd food items
    app.get('/my-ordered-items', verifyToken, async (req, res) => {
      const email = req.query?.email;
      if(email !== req.user.email){
        return res.status(403).send({ message: "Unauthorized Access" })
       }
      let query = {}
      if (email) {
        query = { 'buyerData.buyerEmail': email };
      }
      const result = await ordersCollection.find(query).toArray()
      res.send(result)
    })


    //endpoint to get top 6 best selling food items
    app.get('/top-food', async (req, res) => {

      const result = await foodsCollection.find().limit(6).sort("sold", 'desc').toArray();
      res.send(result);
    })

    //endpoint to get all testimonials
    app.get('/testimonials', async (req, res) => {
      const result = await testimonialsCollection.find().toArray();
      res.send(result);
    })

    //endpoint to get all chef's data
    app.get('/chef', async (req, res) => {
      const result = await chefCollection.find().toArray();
      res.send(result);
    })

    //endpoint to get all blogs data
    app.get('/blogs' , async(req, res)=>{
      const result = await blogsCollection.find().toArray();
      res.send(result)
    })


    //endpoint to post a new food items
    app.post('/add-item', async (req, res) => {
      const foodData = req.body;
      const result = await foodsCollection.insertOne(foodData)
      res.send(result);
    })

    //endpoint to post a new orders
    app.post('/new-orders', async (req, res) => {
      const ordersData = req.body.purchaseData;
      const availableQuantity = req.body.available_quantity;
      const filter = { _id: new ObjectId(ordersData.food_id) }
      const updatedData = {
        $set: {
          stock_quantity: availableQuantity,
          sold: ordersData.purchase_quantity
        }
      }
      const updatedResult = await foodsCollection.updateOne(filter, updatedData);
      const result = await ordersCollection.insertOne(ordersData);
      res.send({ result, updatedResult });
    })

    //endpoint to update an item
    app.put('/update-item/:id', async (req, res) => {
      const id = req.params.id;
      const foodData = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedData = {
        $set: {
          food_name: foodData.food_name,
          food_category: foodData.food_category,
          food_img: foodData.food_img,
          price: foodData.price,
          stock_quantity: foodData.stock_quantity,
          sold: foodData.sold,
          made_by: foodData.made_by,
          food_origin: foodData.food_origin,
          short_description: foodData.short_description
        }
      }
      const result = await foodsCollection.updateOne(filter, updatedData)
      res.send(result)
    })


    //endpoint to delete a orders
    app.delete('/delete-order/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await ordersCollection.deleteOne(query)
      res.send(result)
    })





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Luxe Bite Server Is Running')
})

app.listen(port, () => {
  console.log(`Luxe Bite Server Is Running On Port ${port}`);
})