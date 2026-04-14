import useSWR from 'swr';
import type { SchemaDto, SaveSchemaPayload } from '@formmate/shared';
import { getApiClient } from '@formmate/sdk';

export function useSchemaHistory(schemaId: string | null) {
    const { data, error, isLoading } = useSWR<SchemaDto[]>(
        schemaId ? `schema-history-${schemaId}` : null,
        () => getApiClient().getSchemaHistory(schemaId!),
        {
            shouldRetryOnError: false,
            revalidateOnFocus: false,
        }
    );

    return {
        history: data || [],
        isLoading,
        error
    };
}

export function useSchemas() {
    const { data, error, isLoading, mutate } = useSWR<SchemaDto[]>(
        'schemas-all',
        () => getApiClient().getAllSchemas(),
        {
            shouldRetryOnError: false,
            revalidateOnFocus: false,
        }
    );

    const saveSchema = async (payload: SaveSchemaPayload) => {
        const result = await getApiClient().saveSchema(payload);
        await mutate();
        return result;
    };

    const defineEntity = async (payload: any) => {
        const result = await getApiClient().saveEntityDefine(payload);
        await mutate();
        return result;
    };

    const deleteSchema = async (id: number) => {
        await getApiClient().deleteSchema(id);
        await mutate();
    };

    const publishSchema = async (id: number, schemaId: string) => {
        const result = await getApiClient().publishSchema(id, schemaId);
        await mutate();
        return result;
    };

    return {
        entities: data?.filter(s => s.type === 'entity') || [],
        queries: data?.filter(s => s.type === 'query') || [],
        pages: data?.filter(s => s.type === 'page') || [],
        isLoading,
        error,
        saveSchema,
        defineEntity,
        deleteSchema,
        publishSchema,
        mutate
    };
}
