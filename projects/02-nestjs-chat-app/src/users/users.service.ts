import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(data: { name: string; email: string; password: string }): Promise<UserDocument> {
    const existing = await this.userModel.findOne({ email: data.email });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    return this.userModel.create(data);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password');
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id);
  }

  async setOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { isOnline });
  }

  async getOnlineUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ isOnline: true }).select('name email isOnline');
  }
}
