const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app=express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nn2sj3o.mongodb.net/?retryWrites=true&w=majority`;

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

   
    const userCollection = client.db("photographyDb").collection("users");


    app.post('/jwt', (req, res)=>{
      const user =req.body;
      const token =  jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send(token);
    })

     //user related Api
     app.get('/users', async(req, res)=>{
      const result = await userCollection.find().toArray();
      res.send(result);

     })

    app.post('/users', async(req, res)=>{
        const user = req.body;
        const query = {email: user.email}
        const existingUser = await userCollection.findOne(query);
        console.log(existingUser);
        if(existingUser){
          return res.send({message: 'user already exists'})
        }
        const result = await userCollection.insertOne(user);
        res.send(result);

    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ admin: false })
      // }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
    })

   

    app.patch('/users/admin/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);


    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }

      const query = { email: email }
      const user = await userCollection.findOne(query);
      const result = { instructor: user?.role2 === 'instructor' }
      res.send(result);
    })

  
    app.patch('/users/instructor/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          role2: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);


    })
    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query={_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      console.log(result);
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
    res.send('Photography server is running ')

})

app.listen(port, ()=>{
    console.log(`Photography server is running on port: ${port}`);
})