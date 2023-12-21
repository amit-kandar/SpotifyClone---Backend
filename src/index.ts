import dotenv from "dotenv";
import { connectToDB } from "./database";


dotenv.config()


connectToDB()