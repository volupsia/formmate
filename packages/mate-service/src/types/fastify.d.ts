import { AuthService } from '../services/auth-service';
import { ChatService } from '../services/chat-service';
import { SocketService } from '../services/socket-service';
import { StatusService } from '../services/status-service';
import { IntentClassifier } from '../models/agents/intent-classifier';
import { AIProvider } from '../infrastructures/ai-provider.interface';
import { FormCMSClient } from '../infrastructures/formcms-client';
import type { ServerToClientEvents, ClientToServerEvents, User } from '@formmate/shared';
import type { SessionStore } from '@fastify/session';
import '@fastify/session';

declare module 'fastify' {
    interface FastifyInstance {
        io: Server<ClientToServerEvents, ServerToClientEvents>;
        chatService: ChatService;
        authService: AuthService;
        socketService: SocketService;
        statusService: StatusService;
        intentClassifier: Record<string, IntentClassifier>;
        aiProvider: Record<string, AIProvider>;
        formCMS: FormCMSClient;
        sessionStore: SessionStore;
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }

    interface FastifyRequest {
        user?: User;
    }

    interface Session {
        externalCookie?: string;
        userId?: string;
    }
}

