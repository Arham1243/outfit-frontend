import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const search = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/roles/search`, payload, {
        params
    });
};
export const list = (payload, params) => {
    return AxiosService.post(`${BASE_URL}/roles/list`, payload, {
        params
    });
};
export const create = (payload) => {
    return AxiosService.post(`${BASE_URL}/roles`, payload);
};

export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/roles/${id}`, payload);
};
export const changeStatus = (id, payload) => {
    return AxiosService.post(`${BASE_URL}/roles/${id}/change-status`, payload);
};

export const deleteItem = (id) => {
    return AxiosService.delete(`${BASE_URL}/roles/${id}/delete`);
};

export const getItem = (id) => {
    return AxiosService.get(`${BASE_URL}/roles/${id}`);
};
export const getRolePermissions = (id) => {
    return AxiosService.get(`${BASE_URL}/roles/${id}/permissions`);
};
export const listRolePermissions = (id) => {
    return AxiosService.get(`${BASE_URL}/roles/list/${id}/permissions`);
};
export const syncRolePermissions = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/roles/${id}/permissions`, payload);
};
