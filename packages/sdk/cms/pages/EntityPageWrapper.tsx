import {useSchema} from "../services/schema";
import React from "react";
import {useParams} from "react-router-dom";
import {XEntity} from "../../types/xEntity";
import {usePageTitle} from "../../hooks/usePageTitle";

interface EntitySchemaContainerProps {
    baseRouter: string,
    page: React.FC<{ baseRouter: string, schema: XEntity }>;
    appName?: string;
}

export function EntityPageWrapper({baseRouter, page: Page, appName = 'FormMate'}: EntitySchemaContainerProps) {
    const {schemaName} = useParams()
    let {data: schema, error} = useSchema(schemaName)
    usePageTitle(schema?.displayName || schemaName, appName, '📋');
    return <>
        {error && <div>{error}</div>}
        {schema && <Page baseRouter={baseRouter} schema={schema}/>}
    </>
}