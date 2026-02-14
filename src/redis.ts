
import { createClient, type RedisClientOptions, type RedisClientType, type RedisDefaultModules } from 'redis';
import dotenv from "dotenv"
dotenv.config()

function getRedisUrl(): string {
  const raw = process.env.REDIS_URL ?? "";
  if (!raw) {
    console.error("REDIS_URL not set");
    throw new Error("REDIS_URL not set");
  }
  // Already a full URL (redis:// or rediss://)
  if (raw.startsWith("redis://") || raw.startsWith("rediss://")) {
    return raw;
  }
  // Build URL from host + port + username + password (e.g. Redis Cloud)
  // Use TLS only when REDIS_TLS=1 (many cloud hosts use plain TCP on non-6379 ports)
  const port = process.env.REDIS_PORT ?? "6379";
  const protocol = process.env.REDIS_TLS === "1" ? "rediss" : "redis";
  const username = encodeURIComponent(process.env.REDIS_USERNAME ?? "default");
  const password = encodeURIComponent(process.env.REDIS_PASSWORD ?? "");
  const host = raw;
  const auth = password ? `${username}:${password}@` : "";
  return `${protocol}://${auth}${host}:${port}`;
}

export type RedisClient=RedisClientType<RedisDefaultModules,{},{},2,{}>
let clients:Record<string,Promise<RedisClient>>={}
let retries:Record<string,number>={}

async function wait(ms:number){
    return new Promise((resolve)=>setTimeout(resolve,ms))
}

async function refreshClient(client:RedisClient){
    if(client){
        const options=client.options
        if(options?.url){
            delete clients[options?.url]
        }
        await getClient(options)
    }
}

export default async function getClient(
    options?: RedisClientOptions,
  ): Promise<RedisClient> {
    options = Object.assign(
      {},
      {
        url: getRedisUrl(),
      },
      options,
    );
  
    if (!options.url) {
      throw new Error("You must pass a URL to connect");
    }
  
    const clientPromise = clients[options.url];
  
    if (clientPromise) {
      return clientPromise;
    }
  
    try {
      const client = createClient(options) as RedisClient;
  
      client.on("error", async (err) => {
        const url = options.url ?? "";
        delete clients[url];

        console.error("Redis Client Error");
        console.error(err);

        try {
          client.destroy();
          await client.close();
        } catch (err) {}

        const clientRetries = retries[url] ?? 0;
        retries[url] = clientRetries + 1;
        try {
          // Exponential backoff with jitter
          await wait(2 ** ((clientRetries % 10) + 1) * 10);
          console.log(
            `${clientRetries} connection failures, reconnecting to Redis...`,
          );
          await refreshClient(client);
        } catch (e) {}
      });
  
      const clientPromise = new Promise<RedisClient>(async (resolve) => {
        await client.connect();
        console.log("Connected to Redis")
        resolve(client);
      });
      clients[options.url] = clientPromise;
      return clientPromise;
    } catch (err) {
      console.error("Error creating Redis client:");
      console.error(err);
  
      throw err;
    }
}
