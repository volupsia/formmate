import type { ChatMessage } from '@formmate/shared';

export interface IChatRepository {
    save(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<ChatMessage>;
    findAll(): Promise<ChatMessage[]>;
}
