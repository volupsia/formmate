import axios from 'axios';
import { FormCmsApiClient } from '@formmate/shared';

let apiBaseURL = "";
let client: FormCmsApiClient = new FormCmsApiClient(axios.create({ baseURL: apiBaseURL, withCredentials: true }));

export function setAuthApiBaseUrl(v: string) {
    apiBaseURL = v;
    client = new FormCmsApiClient(axios.create({ baseURL: v, withCredentials: true }));
}
export function fullAuthApiUrl(subPath: string) {
    return apiBaseURL + subPath
}

export function getApiClient() {
    return client;
}