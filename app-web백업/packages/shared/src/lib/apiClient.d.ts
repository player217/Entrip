import { AxiosInstance } from 'axios';
export declare const apiClient: AxiosInstance;
export declare const handleApiError: (error: unknown) => string;
export declare const API_ENDPOINTS: {
    dashboard: {
        stats: string;
    };
    booking: {
        list: string;
        detail: (id: string) => string;
        create: string;
        update: (id: string) => string;
        delete: (id: string) => string;
    };
    exchange: {
        current: string;
        history: string;
    };
    auth: {
        login: string;
        logout: string;
        refresh: string;
    };
};
//# sourceMappingURL=apiClient.d.ts.map