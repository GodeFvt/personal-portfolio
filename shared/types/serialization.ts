/** JSON representation of server records. Only imported as a type by the client. */
export type Serialized<T> = T extends Date
  ? string
  : T extends bigint
    ? string
    : T extends readonly (infer Item)[]
      ? Serialized<Item>[]
      : T extends object
        ? { [Key in keyof T]: Serialized<T[Key]> }
        : T;
