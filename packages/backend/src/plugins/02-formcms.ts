import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { FormCMSClient } from '../infrastructures/formcms-client';
import { config } from '../config';

const formcmsPlugin: FastifyPluginAsync = async (fastify) => {
    const formcmsClient = new FormCMSClient(config.FORMCMS_BASE_URL);
    fastify.decorate('formCMS', formcmsClient);
};

export default fp(formcmsPlugin, {
    name: 'formCMS'
});
