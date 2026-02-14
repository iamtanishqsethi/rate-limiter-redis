import getClient from "../redis.ts";
import { type RateLimitResult } from "../types/index.ts";

export interface SlidingWindowCounterConfig{
    maxRequests:number
    windowSeconds:number
}

export const DEFAULT_CONFIG:SlidingWindowCounterConfig={
    maxRequests:10,
    windowSeconds:10,
}

/**
 * Sliding Window Counter rate limiter
 * 
 * Keeps two fixed window counters (current and previous) and 
 * computees a weighted count based in how far into the current window are we
 * This Smooths the boundry spike of plain 
 * fixed windows while using very little memory (only two keys)
 */

export async function attempt(key:string,config:SlidingWindowCounterConfig=DEFAULT_CONFIG):Promise<RateLimitResult>{
    const redis=await getClient()
    const {maxRequests,windowSeconds}=config

    const now=Math.floor(Date.now()/1000)
    const currentWindow=Math.floor(now/windowSeconds)
    const previousWindow=currentWindow-1

    const currentKey=`${key}:${currentWindow}`
    const previousKey=`${key}:${previousWindow}`


    //how far through the current window (0...1)
    const elapsed=(now%windowSeconds)/windowSeconds

    //get prevoius window count
    const prevCount=parseInt((await redis.get(previousKey))??"0",10)
    //weight by how much of the previous window still overlaps 
    const weightPrev=prevCount*(1-elapsed)
    //get current window count before incrementing
    const currentCount=parseInt((await redis.get(currentKey))??"0",10)
    const estimatedCount= weightPrev+currentCount

    if(estimatedCount>=maxRequests){
        const retryAfter=Math.ceil(windowSeconds*(1-elapsed))
        return {
            allowed:false,
            remaining:0,
            limit:maxRequests,
            retryAfter:Math.max(1,retryAfter)
        }
    }

    //allowed -> increment current window
    const newCount=await redis.incr(currentKey)
    if(newCount===1){
        await redis.expire(currentKey,windowSeconds*2)
    }

    const newEstimate=weightPrev*newCount
    const remaining=Math.max(0,Math.floor(maxRequests-newEstimate))

    return {
        allowed:true,
        remaining,
        limit:maxRequests,
        retryAfter:null,
    }
}