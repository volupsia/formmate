import type { User } from '@formmate/shared';
import type { ServiceLogger } from '../types/logger';
import { FormCmsClientBuilder } from '../infrastructures/formcms-client';

export class AuthService {
    constructor(
        private readonly client: FormCmsClientBuilder,
        private readonly logger: ServiceLogger
    ) { }


    async getUserProfile(externalCookie: string): Promise<User | null> {
        try {
            return await this.client.getClient(externalCookie).getMe();
        } catch (error: any) {
            return null;
        }
    }

}
