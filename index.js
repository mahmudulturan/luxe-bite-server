const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
  ],
  credentials: true
}))
app.use(express.json())



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
    await client.connect();

    const foodsCollection = client.db('luxeBiteDB').collection('allFoodItems');
    const testimonialsCollection = client.db('luxeBiteDB').collection('testimonial');
    const chefCollection = client.db('luxeBiteDB').collection('chef');
    const ordersCollection = client.db('luxeBiteDB').collection('orders');

    //endpoint to get all food items
    app.get('/all-food-items', async (req, res) => {
      const searchKey = req.query.search;
      const limit = Number(req.query.limit);
      const skip = req.query.page * limit;
      let query = {};
      if(searchKey){
        query = { food_name: { $regex: new RegExp(searchKey, 'i') }}
      }
      const result = await foodsCollection.find(query).skip(skip).limit(limit).toArray();
      const count = await foodsCollection.estimatedDocumentCount();
      res.send({ result, count });
    })

    //endpoint to get single food items by id
    app.get('/all-food-items/:id', async (req, res) => {
      const id = req.params.id;
      const cursor = { _id : new ObjectId(id)};
      const result = await foodsCollection.findOne(cursor);
      res.send(result);
    })

    //endpoint to get my added food items
    app.get('/my-added-items', async(req, res)=>{
      const email = req.query?.email;
      let query = {}
      if(email){
         query = { 'made_by.email': email};
      }
      const result = await foodsCollection.find(query).toArray()
      res.send(result)
      console.log(email);
    })

    // app.get('/all-food-count', async(req, res) => {
    //   const count = await allFoodItemsCollection.estimatedDocumentCount();
    //   res.send({count})
    // })

    //endpoint to get top 6 best selling food items
    app.get('/top-food', async (req, res) => {

      const result = await foodsCollection.find().sort("sold", 'desc').limit(6).toArray();
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


    //endpoint to post a new food items
    app.post('/add-item', async(req, res)=>{
      const foodData = req.body;
      const result = await foodsCollection.insertOne(foodData)
      res.send(result);
    })

    //endpoint to post a new orders
    app.post('/new-orders', async(req, res)=>{
      const ordersData = req.body.purchaseData;
      const availableQuantity = req.body.available_quantity;
      const filter = { _id: new ObjectId(ordersData.food_id)}
      const updatedData = {
        $set: {
          stock_quantity: availableQuantity
        }
      }
      const updatedResult = await foodsCollection.updateOne(filter, updatedData);
      const result = await ordersCollection.insertOne(ordersData);
      res.send({result, updatedResult});
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
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