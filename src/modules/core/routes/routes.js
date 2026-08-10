import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: 'wardrobe',
                name: 'Wardrobe',
                component: () =>
                    import('@/modules/core/views/wardrobe/index.vue'),
                meta: {
                    breadcrumb: [{ label: 'breadcrumbs.wardrobe' }],
                    permission: ['core.wardrobe.view']
                }
            },
            {
                path: 'outfits',
                name: 'Outfits',
                component: () =>
                    import('@/modules/core/views/outfits/index.vue'),
                meta: {
                    breadcrumb: [{ label: 'breadcrumbs.outfits' }],
                    permission: ['core.outfits.view']
                }
            }
        ]
    }
];
