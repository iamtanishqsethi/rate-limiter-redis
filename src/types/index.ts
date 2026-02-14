export interface RateLimitResult{
    allowed:boolean
    remaining:number
    limit:number
    retryAfter:number|null
}
