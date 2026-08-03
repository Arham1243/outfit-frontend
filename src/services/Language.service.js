import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const getActiveLanguages = async () => {
    const res = await AxiosService.get(`${BASE_URL}/languages/active`);
    return res.data?.data ?? [];
};
