import dotenv from "dotenv";
import { connectToDB } from "./database";
import { app } from "./app";

dotenv.config({
    path: "./.env"
})

const PORT = process.env.PORT || 8000;

connectToDB()
    .then(() => {
        app.on("error", err => {
            console.log("Error: ", err);
        })

        app.listen(PORT, () => {
            console.log(`server is running at port ${PORT}`);
        })
    })
    .catch(err => console.log("MongoDB connection failed!!", err))