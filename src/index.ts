import dotenv from "dotenv";
import { connectToDB } from "./database";
import { app } from "./app";
import { v2 as cloudinary } from "cloudinary";
import redisClient from "./config/redis";

dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 8000;

// Define the configuration parameters
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
    api_key: process.env.CLOUDINARY_API_KEY || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || ''
});

connectToDB()
    .then(() => {
        app.on("error", err => {
            console.log("Error: ", err);
        })

        app.listen(PORT, () => {
            console.log(`server is running at port ${PORT}`);
        })
        redisClient.connect()
    })
    .catch(err => console.log("MongoDB connection failed!!", err))