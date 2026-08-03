import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/users/search`, payload, {
        params
    });
};

export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/users/list`, payload, {
        params
    });
};

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/users/${id}`, { params });
};

export const getUserPermissions = (id, params) => {
    return AxiosService.get(`${BASE_URL}/users/${id}/permissions`, { params });
};

export const listUserPermissions = (id, params) => {
    return AxiosService.get(`${BASE_URL}/users/list/${id}/permissions`, {
        params
    });
};

export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/users`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/users/${id}`, payload);
};

export const changeStatus = (id, payload) => {
    return AxiosService.post(`${BASE_URL}/users/${id}/change-status`, payload);
};

export const resendWelcomeEmail = (id) => {
    return AxiosService.post(`${BASE_URL}/users/${id}/resend-welcome-email`);
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/users/${id}`);
};
