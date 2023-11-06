export function enumValueToKey(enumObj: any, enumValue: any) {
    return Object.keys(enumObj).find(key => enumObj[key] === enumValue);
}
