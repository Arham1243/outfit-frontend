import { PureAbility } from '@casl/ability';

export const ability = new PureAbility();

export function updateAbility(permissions) {
    const list = Array.isArray(permissions) ? permissions : [];
    const rules = list.map((permission) => {
        return { action: permission };
    });

    ability.update(rules);
}
