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
        } catch (error: any) {
            const errorSummary = {
                message: error.message,
                status: error.response?.status,
                url: error.config?.url
            };
            this.logger.error(errorSummary, 'External Profile Error');
            return null;
        }
    }

}
