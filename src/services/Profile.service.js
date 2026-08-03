import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const getItem = (id, params) => {
    return AxiosService.get(`${BASE_URL}/profiles/${id}`, { params });
};
export const update = (id, payload) => {
    return AxiosService.put(`${BASE_URL}/profiles/${id}`, payload);
};
export const getMyPermissions = () => {
    return AxiosService.get(`${BASE_URL}/permissions/me`);
};
