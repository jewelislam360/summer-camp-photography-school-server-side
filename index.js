const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app=express();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
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
    const addclassCollection = client.db("photographyDb").collection("addclass");
    const selectedClassCollection = client.db("photographyDb").collection("selectedClass");
    const paymentCollection = client.db("photographyDb").collection("payments");



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

    app.get('/users/instructor/:email', async (req, res) => {

      const email = req.params.email;

      // if (req.decoded.email !== email) {
      //   res.send({ instructor: false })
      // }

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

    //class related api
    app.post('/addclass', async(req,res)=>{
      const newClass=req.body;
      const result=await addclassCollection.insertOne(newClass);
      res.send(result);
      

    })

    app.get('/allclass', async (req, res) => {
      const result = await addclassCollection.find().toArray();
      res.send(result);
    })

    app.delete('/allclass/:id', async(req, res)=>{
      const id = req.params.id;
      const query={_id: new ObjectId(id)};
      const result = await addclassCollection.deleteOne(query);
      console.log(result);
      res.send(result);
    })

    app.patch('/allclass/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: 'approve'
        },
      };
      const result = await addclassCollection.updateOne(filter, updateDoc);
      res.send(result);


    })
    app.patch('/allclass/status/:id', async(req,res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updateDoc = {
        $set: {
          status: 'pending'
        },
      };
      const result = await addclassCollection.updateOne(filter, updateDoc);
      res.send(result);


    })

    app.get('/allclass/:status', async (req, res) => {
      const status = req.params.status;
      const query={status: 'approve'};
      const result = await addclassCollection.find(query ).toArray();
      
      res.send(result);
    })

    app.get('/users/:instructor', async(req, res)=>{
      const role2 = req.params.instructor;
      const query={role2: 'instructor'};
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/selectedclass', async(req, res)=>{
      const selectClass=req.body;
      const result=await selectedClassCollection.insertOne(selectClass);
      res.send(result);

    })
    app.get('/selectedclass/:email', async(req, res)=>{
      const email = req.params.email;
      const query={email: email};
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/payment/:id', async(req, res)=>{
      const id= req.params.id;
      const filter= {_id: new ObjectId(id)}
      const result= await selectedClassCollection.findOne(filter);
      res.send(result);
    } )

    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = {_id: new ObjectId(payment.paymentClassId)}

      const deleteResult = await selectedClassCollection.deleteMany(query)
      const filter = {_id: new ObjectId(payment.classId)}
      const filterClass = await addclassCollection.findOne(filter);
      if(filterClass){
        const sitUpdate= filterClass.availableSeats-1 ;
        // const enrolledStudents = filterClass.enrolledStudent+1 ;
        const updateDoc ={
          $set:{
            availableSeats: sitUpdate,
            // enrolledStudent: enrolledStudents,

          }
        }
        const updateResult = await addclassCollection.updateOne(filter,updateDoc);
        res.send({insertResult, deleteResult, updateResult })
      
        
      }

      else{
        res.status(404).send("data not found")
      }
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