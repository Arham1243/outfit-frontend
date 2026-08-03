import AppLayout from '@/layout/AppLayout.vue';
import AuthLayout from '@/layout/AuthLayout.vue';

const modules = import.meta.glob('@/modules/*/index.js', { eager: true });
const items = [];
Object.keys(modules).forEach((path) => {
    let module = modules[path];
    module = module.default;
    module.routes.map((routes) => {
        items.push(routes);
    });
});

export default [
    {
        path: '/',
        name: 'Home',
        component: AppLayout,
        redirect: '/wardrobe'
    },
    {
        path: '/auth',
        component: AuthLayout,
        children: [
            {
                path: 'login',
                name: 'Login',
                component: () => import('@/views/auth/Login.vue')
            },
            {
                path: 'verify/email',
                name: 'CodeVerification',
                component: () => import('@/views/auth/VerifyEmailCode.vue')
            },
            {
                path: 'password/forget',
                name: 'Password Reset Request',
                component: () => import('@/views/auth/PasswordResetRequest.vue')
            },
            {
                path: 'password/reset',
                name: 'New Password Setup',
                component: () => import('@/views/auth/PasswordResetForm.vue')
            },
            {
                path: 'password/set',
                name: 'Password Setup',
                component: () => import('@/views/auth/PasswordSetup.vue')
            }
        ]
    },
    {
        path: '/profile',
        component: AppLayout,
        children: [
            {
                path: '',
                name: 'Profile',
                component: () => import('@/views/profile/index.vue'),
                meta: {
                    breadcrumb: [
                        { label: 'breadcrumbs.wardrobe', route: '/wardrobe' },
                        { label: 'breadcrumbs.profile' }
                    ]
                }
            }
        ]
    },
    {
        path: '/offline',
        name: 'Offline',
        component: () => import('@/views/errors/Offline.vue')
    },
    ...items,
    {
        path: '/:pathMatch(.*)*',
        component: () => import('@/views/errors/NotFound.vue')
    }
];
