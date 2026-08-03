import AppLayout from '@/layout/AppLayout.vue';

export default [
    {
        path: '/',
        component: AppLayout,
        children: [
            {
                path: 'wardrobe',
                name: 'Wardrobe',
                component: () => import('@/modules/core/views/wardrobe/index.vue'),
                meta: {
                    breadcrumb: [{ label: 'breadcrumbs.wardrobe' }],
                    permission: ['core.wardrobe.view']
                }
            },
            {
                path: 'users',
                children: [
                    {
                        path: '',
                        name: 'Users',
                        component: () => import('@/modules/core/views/user/list.vue'),
                        meta: {
                            breadcrumb: [{ label: 'breadcrumbs.users' }],
                            permission: ['core.users.view']
                        }
                    },
                    {
                        path: 'new',
                        name: 'NewUser',
                        component: () => import('@/modules/core/views/user/new.vue'),
                        meta: {
                            breadcrumb: [
                                { label: 'breadcrumbs.users', route: '/users' }
                            ],
                            permission: ['core.users.create']
                        }
                    },
                    {
                        path: ':id/edit',
                        name: 'EditUser',
                        component: () => import('@/modules/core/views/user/edit.vue'),
                        meta: {
                            breadcrumb: [
                                { label: 'breadcrumbs.users', route: '/users' }
                            ],
                            permission: ['core.users.edit']
                        }
                    }
                ]
            },
            {
                path: 'roles',
                component: () => import('@/modules/core/views/role/index.vue'),
                children: [
                    {
                        path: '',
                        name: 'User Roles',
                        component: () => import('@/modules/core/views/role/role.vue'),
                        meta: {
                            breadcrumb: [{ label: 'breadcrumbs.userRoles' }],
                            permission: ['core.roles.view']
                        }
                    },
                    {
                        path: ':id/permissions',
                        name: 'RolePermissions',
                        component: () =>
                            import('@/modules/core/views/role/permission.vue'),
                        meta: {
                            breadcrumb: [
                                {
                                    label: 'breadcrumbs.userRoles',
                                    route: '/roles'
                                }
                            ],
                            permission: ['core.roles.edit']
                        }
                    }
                ]
            }
        ]
    }
];
