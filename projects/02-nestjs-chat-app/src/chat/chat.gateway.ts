import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { UsersService } from '../users/users.service';
import { SendMessageDto, JoinRoomDto } from './dto/chat.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private connectedUsers = new Map<string, string>(); // socketId -> userId

  constructor(
    private chatService: ChatService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findById(payload.sub);

      if (!user) {
        client.disconnect();
        return;
      }

      this.connectedUsers.set(client.id, user._id.toString());
      await this.usersService.setOnlineStatus(user._id.toString(), true);

      client.data.userId = user._id.toString();
      client.data.userName = user.name;

      this.server.emit('user:online', { userId: user._id, name: user.name });
      this.logger.log(`User ${user.name} (${user._id}) connected`);
    } catch (err) {
      this.logger.error(`Connection error: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      await this.usersService.setOnlineStatus(userId, false);
      this.server.emit('user:offline', { userId });
      this.logger.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    client.join(dto.room);

    const history = await this.chatService.getRoomHistory(dto.room);
    client.emit('room:history', { room: dto.room, messages: history });

    client.to(dto.room).emit('room:user_joined', {
      userId: client.data.userId,
      name: client.data.userName,
      room: dto.room,
    });

    this.logger.log(`User ${client.data.userName} joined room: ${dto.room}`);
    return { event: 'room:join', data: { success: true, room: dto.room } };
  }

  @SubscribeMessage('room:leave')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    client.leave(dto.room);
    client.to(dto.room).emit('room:user_left', {
      userId: client.data.userId,
      name: client.data.userName,
      room: dto.room,
    });

    this.logger.log(`User ${client.data.userName} left room: ${dto.room}`);
    return { event: 'room:leave', data: { success: true, room: dto.room } };
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    if (!client.data.userId) {
      throw new WsException('Not authenticated');
    }

    const message = await this.chatService.saveMessage(
      client.data.userId,
      dto.content,
      dto.room,
    );

    this.server.to(dto.room).emit('message:new', message);
    this.logger.log(`Message in room "${dto.room}" from ${client.data.userName}`);

    return { event: 'message:send', data: { success: true, message } };
  }

  @SubscribeMessage('message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; room: string },
  ) {
    const deleted = await this.chatService.deleteMessage(payload.messageId, client.data.userId);
    if (deleted) {
      this.server.to(payload.room).emit('message:deleted', { messageId: payload.messageId });
    }
    return { event: 'message:delete', data: { success: deleted } };
  }
}
