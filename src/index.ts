import express from "express";
import dotenv from 'dotenv';
import { client } from './redis.ts';
import { rateLimiter } from "./rateLimiter.ts";

dotenv.config();
const app = express()

app.use(rateLimiter(100,60))//100 request per 60 sec

app.get('/',(req,res)=>{
    res.send("Wellcome! you are within the rate limit")
})


client.on('error', err => console.log('Redis Client Error', err));

client.connect().then(()=>{
    console.log("Connected to redis")
    app.listen(8000, () => {
        console.log("Server is running on port 8000");
    });
}).catch(()=>console.log("Error connecting to database"))






