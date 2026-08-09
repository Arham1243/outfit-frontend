import AxiosService from '@/services/Axios.service';
const BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;

export const list = (params) => {
    return AxiosService.get(`${BASE_URL}/outfits`, { params });
};

export const generate = (params) => {
    return AxiosService.post(`${BASE_URL}/outfits/generate`, null, { params });
};

export const getBatch = (batchId) => {
    return AxiosService.get(`${BASE_URL}/outfits/generated/${batchId}`);
};

export const getLatestBatch = () => {
    return AxiosService.get(`${BASE_URL}/outfits/latest-batch`);
};

export const getTypeCounts = () => {
    return AxiosService.get(`${BASE_URL}/outfits/wardrobe-type-counts`);
};

export const getCombinationStats = () => {
    return AxiosService.get(`${BASE_URL}/outfits/combination-stats`);
};
