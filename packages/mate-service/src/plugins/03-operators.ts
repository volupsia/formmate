import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { EntityOperator, QueryOperator } from '@formmate/shared';
import { DataOperator } from '@formmate/shared/operators/data-operator';
import { PageOperator } from '../operators/page-operator';
import { TaskOperator } from '../operators/task-operator';
import { config } from '../config';

const operatorsPlugin: FastifyPluginAsync = async (fastify) => {
    fastify.log.info('Starting operators plugin...');

    const modelLogger = fastify.log.child({ component: 'MODEL' }, { level: config.LOG_LEVEL_MODEL });
    const serviceLogger = fastify.log.child({ component: 'SERVICE' }, { level: config.LOG_LEVEL_SERVICE });

    const formcmsClient = fastify.formCMS;
    const systemSettingRepository = fastify.systemSettingRepository;
    const agentTaskRepository = fastify.agentTaskRepository;

    const entityOperator = new EntityOperator(formcmsClient, modelLogger);
    const pageOperator = new PageOperator(formcmsClient, modelLogger, systemSettingRepository);
    const taskOperator = new TaskOperator(agentTaskRepository, serviceLogger);
    const queryOperator = new QueryOperator(formcmsClient);
    const dataOperator = new DataOperator(formcmsClient);

    fastify.decorate('entityOperator', entityOperator);
    fastify.decorate('pageOperator', pageOperator);
    fastify.decorate('taskOperator', taskOperator);
    fastify.decorate('queryOperator', queryOperator);
    fastify.decorate('dataOperator', dataOperator);
};

export default fp(operatorsPlugin, {
    name: 'operators',
    dependencies: ['infrastructure', 'repositories']
});
