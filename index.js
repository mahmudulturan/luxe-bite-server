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

    //endpoint to get all food items
    app.get('/all-food-items', async (req, res) => {
      const limit = Number(req.query.limit);
      const skip = req.query.page * limit;
      const result = await foodsCollection.find().skip(skip).limit(limit).toArray();
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