import { Document, Model, Schema, model } from 'mongoose';

export interface User {
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  tenantId: string;
  createdAt: Date;
}

export interface UserDocument extends User, Document {}

const userSchema = new Schema<UserDocument>(
  {
    googleId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    name: { type: String, required: true },
    avatar: String,
    tenantId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

userSchema.index({ tenantId: 1, googleId: 1 }, { unique: true });
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const UserModel: Model<UserDocument> =
  model<UserDocument>('User', userSchema);


