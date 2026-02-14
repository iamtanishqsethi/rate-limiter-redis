import type { NextFunction, Request, Response } from "express";
import type { SlidingWindowCounterConfig } from "../components/slidingWindowCounter.ts";
import { attempt } from "../components/slidingWindowCounter.ts";

const DEFAULT_CONFIG:SlidingWindowCounterConfig={
    maxRequests:10,
    windowSeconds:10,
}

export type SlidingWindowCounterMiddleWareOptions={
    config?:SlidingWindowCounterConfig
    keyPrefix?:string
    getIdentifier?:(req:Request)=>string
}

export function SlidingWindowCounterMiddleWare(options:SlidingWindowCounterMiddleWareOptions={}){
    const {config=DEFAULT_CONFIG,keyPrefix="rl",getIdentifier=(req:Request)=>req.ip??req.socket.address??"anonymous"}=options

    return async (req:Request,res:Response,next:NextFunction)=>{
        try{
            const id=getIdentifier(req)
            const key=`${keyPrefix}:${id}`
            const result=await attempt(key,config)

            res.setHeader("X-RateLimit-Limit",String(result.limit))
            res.setHeader("X-RateLimit-Remaining",String(result.remaining))

            if(!result.allowed){
                if(result.retryAfter!=null){
                    res.setHeader("Retry-after",String(result.retryAfter))
                }

                return res.status(429).json({
                    message: "Too many requests",
                    retryAfter: result.retryAfter ?? undefined,
                })
            }

            next()

        }
        catch (err){
            next(err)
        }
    }
}