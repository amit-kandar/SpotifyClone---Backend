import { Document, Schema, model, Model } from "mongoose";

interface searchDocument extends Document {
    user: Schema.Types.ObjectId;
    query: string;
}

const SearchSchema = new Schema<searchDocument, Model<searchDocument>>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    query: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

export const Search = model<searchDocument>('Search', SearchSchema);