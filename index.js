const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

//middlewares
app.use(cors({origin: [
    'http://localhost:5173',
],
credentials: true}))
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

    const allFoodItemsCollection = client.db('luxeBiteDB').collection('allFoodItems');

    //endpoint to get all food items
    app.get('/all-food-items', async(req, res)=> {
        const result = await allFoodItemsCollection.find().toArray();
        res.send(result);
    })

    //endpoint to get top 6 best selling food items
    app.get('/top-food', async(req, res)=> {
        
        const result = await allFoodItemsCollection.find().sort("sold",'desc').limit(6).toArray();
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


app.get('/', (req, res)=>{
    res.send('Luxe Bite Server Is Running')
})

app.listen(port, ()=> {
    console.log(`Luxe Bite Server Is Running On Port ${port}`);
})