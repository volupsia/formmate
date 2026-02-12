import useSWR from 'swr';
import axios from 'axios';
import { type User, ENDPOINTS, type LoginRequest } from '@formmate/shared';
import { config } from '../config';

const fetcher = (url: string) => axios.get(url, { withCredentials: true }).then(res => res.data);

export function useAuth() {
    const { data, error, mutate } = useSWR<User>(
        `${config.FORMCMS_BASE_URL}${ENDPOINTS.AUTH.ME}`,
        fetcher,
        {
            shouldRetryOnError: false,
            revalidateOnFocus: false,
        }
    );

    const { data: systemReadyData, mutate: checkSystemStatus } = useSWR<{ databaseReady: boolean; hasSuperAdmin: boolean }>(
        `${config.FORMCMS_BASE_URL}/api/system/is-ready`,
        fetcher
    );

    const login = async (usernameOrEmail: string, password: string) => {
        try {
            await axios.post(`${config.FORMCMS_BASE_URL}${ENDPOINTS.AUTH.LOGIN}`,
                { usernameOrEmail, password } as LoginRequest,
                { withCredentials: true }
            );

            await checkSystemStatus();
            return await mutate();
        } catch (error: any) {
            return error.response?.data || { success: false, error: 'Login failed' };
        }
    };

    const logout = async () => {
        try {
            await axios.post(`${config.FORMCMS_BASE_URL}${ENDPOINTS.AUTH.LOGOUT}`, {}, {
                withCredentials: true
            });
        } catch (error) {
            console.error('Logout failed', error);
        }
        mutate();
        window.location.href = '/mate/login';
    };

    return {
        user: data,
        isLoading: !error && !data,
        isError: !!error,
        login,
        logout,
        checkSystemStatus,
        databaseReady: systemReadyData?.databaseReady,
        hasSuperAdmin: systemReadyData?.hasSuperAdmin,
    };
}
