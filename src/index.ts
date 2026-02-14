import express from "express";
import dotenv from "dotenv";
import { fixedWindowMiddleware } from "./middleware/fixedWindowMiddleware.ts";

dotenv.config();
const app = express();

// Apply fixed-window rate limit: 10 requests per 10 seconds per IP (default)
app.use(fixedWindowMiddleware());

// Or with custom config and options:
// app.use(fixedWindowMiddleware({
//   config: { maxRequest: 5, windowSeconds: 60 },
//   keyPrefix: "api",
//   getIdentifier: (req) => req.headers["x-api-key"] as string ?? req.ip ?? "anon",
// }));

app.get("/", (req, res) => {
    res.send("Welcome! You are within the rate limit.");
})


app.listen(8000, () => {
    console.log("Server is running on port 8000");
});






