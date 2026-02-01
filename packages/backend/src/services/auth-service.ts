import type { User } from '@formmate/shared';
import type { ServiceLogger } from '../types/logger';
import { FormCMSClient } from '../infrastructures/formcms-client';

export class AuthService {
    constructor(
        private readonly client: FormCMSClient,
        private readonly logger: ServiceLogger
    ) { }


    async getUserProfile(externalCookie: string): Promise<User | null> {
        try {
            return await this.client.getMe(externalCookie);
        } catch (error) {
            this.logger.error({ error }, 'External Profile Error');
            return null;
        }
    }

    async login(payload: any): Promise<{ cookie: string, user: User }> {
        return await this.client.login(payload);
    }

}
