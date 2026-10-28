import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator'
import { splitContactName } from '../contact-name'

// user.first_name and user.last_name are varchar(100) each.
const MAX_NAME_PART = 100

// A full name (two words or more) whose first and last name each fit their column.
export const isValidContactName = (value: unknown): boolean => {
  if (typeof value !== 'string' || !/^\s*\S+\s+\S+/.test(value)) {
    return false
  }
  const { firstName, lastName } = splitContactName(value)
  return firstName.length <= MAX_NAME_PART && lastName.length <= MAX_NAME_PART
}

export function IsContactName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isContactName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: isValidContactName,
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a full name (first and last name), each at most ${MAX_NAME_PART} characters`
        },
      },
    })
  }
}
