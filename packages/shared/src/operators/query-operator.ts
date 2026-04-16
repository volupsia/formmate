import type { IFormCmsClientBuilder } from '../index.js';

export class QueryOperator {
    constructor(private readonly formCMSClient: IFormCmsClientBuilder) {}

    async generateSDL(externalCookie: string): Promise<string> {
        const { getIntrospectionQuery, buildClientSchema, printSchema } = await import('graphql');
        const query = getIntrospectionQuery();

        const resp = await this.formCMSClient.getClient(externalCookie).axios.post('/graphql', { query });

        const introspectionResponse = resp.data.data;
        const schema = buildClientSchema(introspectionResponse);
        return printSchema(schema);
    }
}
