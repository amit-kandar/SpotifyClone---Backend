import mongoose from "mongoose";
import { DB_NAME } from "../constants";

export async function connectToDB(): Promise<void> {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}`);
        console.log("MongoDB Connected:", connectionInstance.connection.host + "/" + connectionInstance.connection.name);
    } catch (error) {
        console.log("MongoDB connection Error: ", error);
        process.exit(1);
    }
}