// import type { NextFunction,Request,Response} from 'express';
// import { client } from './redis.ts';

// //fixed window rate limiter 
// export const rateLimiter=(limit:number,windowSize:number)=>{
//     return async(req:Request,res:Response,next:NextFunction)=>{
//         const ip=req.ip
//         const key=`rate-limit:${ip}`//each ip gets its own key (counter)

//         const current=await client.incr(key) //increments value by 1
//         // if key doesn’t exist → creates it with value 1
//         if(current===1){
//             await client.expire(key,windowSize)//set expiry on the key 
//             //after the window size ie 60 sec redis deletes it 
//         }

//         if(current>limit){
//             return res.status(429).json({message:"Too many requests"})
//         }

//         next()
//     }
// }