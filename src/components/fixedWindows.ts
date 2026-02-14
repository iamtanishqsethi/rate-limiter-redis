import getClient from "../redis.ts";

export interface RateLimitResult{
    allowed:boolean
    remaining:number
    limit:number
    retryAfter:number|null
}

export interface FixedWindowConfig{
    maxRequest:number
    windowSeconds:number
}

export const DEFAULT_CONFIG:FixedWindowConfig={
    maxRequest:10,
    windowSeconds:10,
}

/**
 * Fixed Window Counter rate limiter
 * 
 * uses a single string key per window.
 * This key name includes the window number (timestamp/windowSeconds) so it naturally
 * rotates.
 * INCR atomically bumps the counter and EXPIRE ensures cleanup
 * 
 * Redis commands: INCR,EXPIRE,TTL
 */

export async function attempt(key:string,config:FixedWindowConfig=DEFAULT_CONFIG):Promise<RateLimitResult>{

    const redis=await getClient()
    const {maxRequest,windowSeconds}=config

    const now=Math.floor(Date.now()/1000)
    const windowKey=`${key}:${Math.floor(now/windowSeconds)}`

    const count=await redis.incr(windowKey)

    if(count===1){
        await redis.expire(windowKey,windowSeconds)
    }

    const allowed=count<=maxRequest
    const remaining=Math.max(0,maxRequest-count)
    let retryAfter:number|null=null

    if(!allowed){
        const ttl=await redis.ttl(windowKey)
        retryAfter=ttl>0?ttl:windowSeconds
    }

    return {allowed,remaining,limit:maxRequest,retryAfter}
}