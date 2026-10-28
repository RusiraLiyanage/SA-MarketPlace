import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'

/** 11-digit ABN with the ATO checksum; mirrors the check in scripts/verify-schema.sql. */
export const isValidAbn = (abn: string): boolean => {
  if (!/^\d{11}$/.test(abn)) {
    return false
  }

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  const sum = abn
    .split('')
    .map(Number)
    .reduce((total, digit, index) => {
      const adjusted = index === 0 ? digit - 1 : digit
      return total + adjusted * weights[index]
    }, 0)

  return sum % 89 === 0
}

export function IsAbn(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAbn',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidAbn(value)
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid 11-digit Australian Business Number`
        },
      },
    })
  }
}
