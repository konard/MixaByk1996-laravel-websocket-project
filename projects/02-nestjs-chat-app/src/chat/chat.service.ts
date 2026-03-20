import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async saveMessage(senderId: string, content: string, room: string): Promise<MessageDocument> {
    const message = await this.messageModel.create({
      sender: new Types.ObjectId(senderId),
      content,
      room,
    });
    return message.populate('sender', 'name email');
  }

  async getRoomHistory(room: string, limit = 50, before?: Date): Promise<MessageDocument[]> {
    const query: any = { room };
    if (before) {
      query.createdAt = { $lt: before };
    }

    const messages = await this.messageModel
      .find(query)
      .populate('sender', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return messages.reverse();
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.messageModel.findById(messageId);
    if (!message) return false;
    if (message.sender.toString() !== userId) return false;
    await message.deleteOne();
    return true;
  }
}
