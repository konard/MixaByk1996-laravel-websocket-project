import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  content: string;

  @Prop({ required: true, trim: true })
  room: string;

  @Prop({ default: false })
  isEdited: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
