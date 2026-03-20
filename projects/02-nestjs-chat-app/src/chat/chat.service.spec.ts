import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { Message } from './schemas/message.schema';
import { Types } from 'mongoose';

describe('ChatService', () => {
  let service: ChatService;

  const mockMessageId = new Types.ObjectId().toString();
  const mockUserId = new Types.ObjectId().toString();

  const mockMessage = {
    _id: mockMessageId,
    sender: new Types.ObjectId(mockUserId),
    content: 'Hello world',
    room: 'general',
    populate: jest.fn().mockReturnThis(),
    deleteOne: jest.fn().mockResolvedValue(undefined),
  };

  const mockMessageModel = {
    create: jest.fn().mockResolvedValue({
      ...mockMessage,
      populate: jest.fn().mockResolvedValue(mockMessage),
    }),
    find: jest.fn().mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([mockMessage]),
    }),
    findById: jest.fn().mockResolvedValue(mockMessage),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  describe('saveMessage()', () => {
    it('creates and populates a message', async () => {
      const populatedMessage = { ...mockMessage };
      const createdMessage = {
        ...mockMessage,
        populate: jest.fn().mockResolvedValue(populatedMessage),
      };
      mockMessageModel.create.mockResolvedValue(createdMessage);

      const result = await service.saveMessage(mockUserId, 'Hello world', 'general');

      expect(mockMessageModel.create).toHaveBeenCalledWith({
        sender: expect.any(Types.ObjectId),
        content: 'Hello world',
        room: 'general',
      });
      expect(createdMessage.populate).toHaveBeenCalledWith('sender', 'name email');
    });
  });

  describe('getRoomHistory()', () => {
    it('returns messages in chronological order', async () => {
      const messages = [
        { ...mockMessage, content: 'First' },
        { ...mockMessage, content: 'Second' },
      ];
      mockMessageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(messages),
      });

      const result = await service.getRoomHistory('general', 50);
      expect(result).toHaveLength(2);
      expect(mockMessageModel.find).toHaveBeenCalledWith({ room: 'general' });
    });

    it('adds before filter when provided', async () => {
      const before = new Date();
      mockMessageModel.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      });

      await service.getRoomHistory('general', 50, before);

      expect(mockMessageModel.find).toHaveBeenCalledWith({
        room: 'general',
        createdAt: { $lt: before },
      });
    });
  });

  describe('deleteMessage()', () => {
    it('deletes message if user is the sender', async () => {
      const msg = {
        ...mockMessage,
        sender: { toString: () => mockUserId },
        deleteOne: jest.fn().mockResolvedValue(undefined),
      };
      mockMessageModel.findById.mockResolvedValue(msg);

      const result = await service.deleteMessage(mockMessageId, mockUserId);
      expect(result).toBe(true);
      expect(msg.deleteOne).toHaveBeenCalled();
    });

    it('returns false when message not found', async () => {
      mockMessageModel.findById.mockResolvedValue(null);
      const result = await service.deleteMessage('nonexistent', mockUserId);
      expect(result).toBe(false);
    });

    it('returns false when user is not the sender', async () => {
      const otherId = new Types.ObjectId().toString();
      const msg = {
        ...mockMessage,
        sender: { toString: () => otherId },
        deleteOne: jest.fn(),
      };
      mockMessageModel.findById.mockResolvedValue(msg);

      const result = await service.deleteMessage(mockMessageId, mockUserId);
      expect(result).toBe(false);
      expect(msg.deleteOne).not.toHaveBeenCalled();
    });
  });
});
